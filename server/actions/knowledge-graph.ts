"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { MASTERY } from "./mastery-constants";
import { checkAndAwardBadges } from "./badges";
import type { ConceptHint, CrossTechLink, DifficultyTier } from "@/lib/knowledge/types";
import { getKBHints } from "@/lib/knowledge";
import { getRelationsFrom } from "@/lib/knowledge/tech-relations";
import {
  hasConceptMatches,
  computeAndStoreConceptMatches,
  getConceptMatchScores,
} from "@/server/actions/concept-matches";

/**
 * Compute adaptive decay lambda based on review_count.
 * More reviews → longer half-life → slower decay.
 * Formula: effective_half_life = base_half_life × (1 + DECAY_REVIEW_BONUS × review_count)
 */
function adaptiveLambda(reviewCount: number): number {
  const effectiveHalfLife = MASTERY.DECAY_HALF_LIFE_DAYS * (1 + MASTERY.DECAY_REVIEW_BONUS * reviewCount);
  return Math.LN2 / effectiveHalfLife;
}

/**
 * Untyped service client for technology_knowledge queries.
 * technology_knowledge is not in the Database type definition.
 */
function createKBServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createSupabaseClient(url, serviceKey);
}

// ── Exported Types ──────────────────────────────────────────────────

export type GraphEdgeType = "prerequisite" | "cross_tech" | "related" | "difficulty_flow";

export interface ConceptGraphNode {
  id: string; // concept_key (unique within graph)
  conceptKey: string;
  conceptName: string;
  technologyName: string;
  technologyNameNormalized: string;
  knowledgeId: string; // technology_knowledge.id
  keyPoints: string[];
  tags: string[];
  masteryLevel: number; // 0-100
  // Extended properties
  difficultyTier?: DifficultyTier;
  category?: string;
  prerequisiteConcepts: string[];
  commonQuizTopics: string[];
  crossTechLinks?: CrossTechLink[];
  // Code matching (0 = not matched / not computed, > 0 = found in project)
  relevanceScore?: number;
  matchedFiles?: string[];
}

export interface ConceptGraphEdge {
  id: string;
  source: string; // concept_key
  target: string; // concept_key
  edgeType: GraphEdgeType;
  relation?: string; // for cross_tech: "foundation" | "similar" | "extends" | "alternative"
}

export interface ConceptGraphData {
  nodes: ConceptGraphNode[];
  edges: ConceptGraphEdge[];
  technologies: string[]; // list of technology names for grouping
}

export interface MasteryRecord {
  knowledgeId: string;
  masteryLevel: number;
  technologyNameNormalized: string;
}

// ── Graph Structure Cache (KB data rarely changes) ──────────────────

interface GraphStructureCache {
  nodes: Omit<ConceptGraphNode, "masteryLevel">[];
  edges: ConceptGraphEdge[];
  technologies: string[];
  knowledgeIds: string[];
  cachedAt: number;
}

const GRAPH_CACHE = new Map<string, GraphStructureCache>();
const GRAPH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Server Actions ──────────────────────────────────────────────────

/**
 * Build the concept graph for a project.
 * Uses caching: KB structure (nodes/edges) cached 5min, mastery always fresh.
 * Edge types: prerequisite, cross_tech (explicit links), related (tag similarity), difficulty_flow.
 */
export async function getConceptGraph(
  projectId: string,
): Promise<{ success: boolean; data?: ConceptGraphData; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify project ownership + get locale in parallel
    const [projectResult, userResult] = await Promise.all([
      supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single(),
      supabase.from("users").select("locale").eq("id", user.id).single(),
    ]);

    if (projectResult.error || !projectResult.data) {
      return { success: false, error: "Project not found" };
    }

    const locale = userResult.data?.locale ?? "ko";
    const cacheKey = `${projectId}:${locale}`;

    // Try to use cached graph structure
    const cached = GRAPH_CACHE.get(cacheKey);
    const now = Date.now();

    let structure: GraphStructureCache;

    if (cached && now - cached.cachedAt < GRAPH_CACHE_TTL_MS) {
      structure = cached;
    } else {
      // Build fresh structure
      structure = await buildGraphStructure(supabase, projectId, locale);
      if (structure.nodes.length > 0) {
        GRAPH_CACHE.set(cacheKey, structure);
      }
    }

    if (structure.nodes.length === 0) {
      return { success: true, data: { nodes: [], edges: [], technologies: [] } };
    }

    // Lazy compute: if no concept matches exist, compute them now
    // This handles techs whose KB was generated after initial analysis
    const matchesExist = await hasConceptMatches(projectId);
    if (!matchesExist) {
      try {
        await computeAndStoreConceptMatches(projectId);
      } catch {
        // Non-fatal — graph works without matches
      }
    }

    // Fetch mastery + match scores in parallel
    const kbClient = createKBServiceClient();
    const [masteryResult, matchScores] = await Promise.all([
      kbClient
        .from("user_concept_mastery")
        .select("knowledge_id, concept_key, mastery_level, last_reviewed_at, review_count")
        .eq("user_id", user.id)
        .in("knowledge_id", structure.knowledgeIds),
      getConceptMatchScores(projectId),
    ]);

    const masteryRows = masteryResult.data;

    // Build mastery lookup: knowledge_id → (concept_key | null) → { level, lastReviewed, reviewCount }
    const masteryMap = new Map<string, Map<string | null, { level: number; lastReviewed: string | null; reviewCount: number }>>();
    for (const m of masteryRows ?? []) {
      if (!masteryMap.has(m.knowledge_id)) {
        masteryMap.set(m.knowledge_id, new Map());
      }
      masteryMap.get(m.knowledge_id)!.set(m.concept_key ?? null, {
        level: m.mastery_level,
        lastReviewed: m.last_reviewed_at ?? null,
        reviewCount: m.review_count ?? 0,
      });
    }

    // Merge mastery + relevance into nodes with adaptive Ebbinghaus decay
    const decayNow = Date.now();
    const nodes: ConceptGraphNode[] = structure.nodes.map((n) => {
      const techMap = masteryMap.get(n.knowledgeId);
      const entry = techMap
        ? (techMap.get(n.conceptKey) ?? techMap.get(null) ?? null)
        : null;

      let effectiveMastery = 0;
      if (entry) {
        effectiveMastery = entry.level;
        if (entry.lastReviewed) {
          const daysSince = (decayNow - new Date(entry.lastReviewed).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 0) {
            const lambda = adaptiveLambda(entry.reviewCount);
            effectiveMastery = Math.round(entry.level * Math.exp(-lambda * daysSince));
          }
        }
      }

      const matchData = matchScores.get(n.conceptKey);
      return {
        ...n,
        masteryLevel: effectiveMastery,
        relevanceScore: matchData?.score,
        matchedFiles: matchData?.files,
      };
    });

    return {
      success: true,
      data: { nodes, edges: structure.edges, technologies: structure.technologies },
    };
  } catch {
    return { success: false, error: "Failed to load concept graph" };
  }
}

/**
 * Build the static graph structure (nodes without mastery, all edges).
 * This is the expensive part that gets cached.
 */
async function buildGraphStructure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  locale: string,
): Promise<GraphStructureCache> {
  const empty: GraphStructureCache = {
    nodes: [], edges: [], technologies: [], knowledgeIds: [], cachedAt: Date.now(),
  };

  // Get project's tech stacks
  const { data: techStacks } = await supabase
    .from("tech_stacks")
    .select("technology_name")
    .eq("project_id", projectId);

  if (!techStacks || techStacks.length === 0) return empty;

  const normalizedNames = techStacks.map((ts) =>
    ts.technology_name.toLowerCase().trim(),
  );

  // Fetch KB entries
  const kbClient = createKBServiceClient();
  let { data: knowledgeRows } = await kbClient
    .from("technology_knowledge")
    .select("id, technology_name, technology_name_normalized, concepts, prerequisites, locale")
    .in("technology_name_normalized", normalizedNames)
    .eq("locale", locale)
    .eq("generation_status", "ready");

  // ── Phase 1-2: Auto KB expansion for unmatched techs ───────────
  // If some tech_stacks don't have KB entries, try syncing from static seeds
  const matchedNormalized = new Set(
    (knowledgeRows ?? []).map((r) => r.technology_name_normalized as string),
  );
  const unmatchedTechs = techStacks.filter(
    (ts) => !matchedNormalized.has(ts.technology_name.toLowerCase().trim()),
  );

  if (unmatchedTechs.length > 0) {
    // Trigger lazy seed sync via getKBHints (non-blocking background write)
    const locale_ = locale as "ko" | "en";
    await Promise.all(
      unmatchedTechs.map((ts) => getKBHints(ts.technology_name, locale_)),
    );

    // Re-fetch KB entries after seed sync
    const { data: refreshedRows } = await kbClient
      .from("technology_knowledge")
      .select("id, technology_name, technology_name_normalized, concepts, prerequisites, locale")
      .in("technology_name_normalized", normalizedNames)
      .eq("locale", locale)
      .eq("generation_status", "ready");

    if (refreshedRows && refreshedRows.length > (knowledgeRows?.length ?? 0)) {
      knowledgeRows = refreshedRows;
    }
  }

  if (!knowledgeRows || knowledgeRows.length === 0) return empty;

  const knowledgeIds = knowledgeRows.map((r) => r.id);
  const technologies: string[] = [];
  const nodes: Omit<ConceptGraphNode, "masteryLevel">[] = [];
  const edges: ConceptGraphEdge[] = [];
  const existingConceptKeys = new Set<string>();

  // Map for cross-tech lookups
  const techRowMap = new Map<string, typeof knowledgeRows[number]>();
  for (const row of knowledgeRows) {
    techRowMap.set(row.technology_name_normalized, row);
  }

  // ── Phase 1: Build nodes ──────────────────────────────────────────
  for (const row of knowledgeRows) {
    technologies.push(row.technology_name);
    const concepts = row.concepts as ConceptHint[];

    for (const concept of concepts) {
      existingConceptKeys.add(concept.concept_key);

      nodes.push({
        id: concept.concept_key,
        conceptKey: concept.concept_key,
        conceptName: concept.concept_name,
        technologyName: row.technology_name,
        technologyNameNormalized: row.technology_name_normalized,
        knowledgeId: row.id,
        keyPoints: concept.key_points,
        tags: concept.tags,
        difficultyTier: concept.difficulty_tier,
        category: concept.category,
        prerequisiteConcepts: concept.prerequisite_concepts,
        commonQuizTopics: concept.common_quiz_topics,
        crossTechLinks: concept.cross_tech_links,
      });
    }
  }

  // ── Phase 2: Intra-tech prerequisite edges ────────────────────────
  for (const row of knowledgeRows) {
    const concepts = row.concepts as ConceptHint[];
    for (const concept of concepts) {
      for (const prereq of concept.prerequisite_concepts) {
        if (existingConceptKeys.has(prereq)) {
          edges.push({
            id: `prereq:${prereq}->${concept.concept_key}`,
            source: prereq,
            target: concept.concept_key,
            edgeType: "prerequisite",
          });
        }
      }
    }
  }

  // ── Phase 3: Explicit cross_tech edges (from cross_tech_links) ────
  for (const row of knowledgeRows) {
    const concepts = row.concepts as ConceptHint[];
    for (const concept of concepts) {
      if (!concept.cross_tech_links) continue;
      for (const link of concept.cross_tech_links) {
        if (existingConceptKeys.has(link.concept_key)) {
          edges.push({
            id: `cross:${link.concept_key}->${concept.concept_key}`,
            source: link.concept_key,
            target: concept.concept_key,
            edgeType: "cross_tech",
            relation: link.relation,
          });
        }
      }
    }
  }

  // ── Phase 3.5: Tag-based related edges (cross-tech only) ─────────
  // Jaccard similarity ≥ threshold, max N per tech pair
  const techPairRelatedCount = new Map<string, number>();

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      // Cross-tech only
      if (a.technologyNameNormalized === b.technologyNameNormalized) continue;

      const pairKey = [a.technologyNameNormalized, b.technologyNameNormalized].sort().join(":");
      const currentCount = techPairRelatedCount.get(pairKey) ?? 0;
      if (currentCount >= MASTERY.RELATED_MAX_PER_PAIR) continue;

      // Jaccard similarity
      const tagsA = new Set(a.tags);
      const tagsB = new Set(b.tags);
      const intersection = [...tagsA].filter(t => tagsB.has(t)).length;
      const union = new Set([...tagsA, ...tagsB]).size;
      if (union === 0) continue;
      const jaccard = intersection / union;
      if (jaccard < MASTERY.RELATED_JACCARD_THRESHOLD) continue;

      // Avoid duplicate edges
      const edgeId = `related:${a.conceptKey}->${b.conceptKey}`;
      if (edges.some(e =>
        (e.source === a.conceptKey && e.target === b.conceptKey) ||
        (e.source === b.conceptKey && e.target === a.conceptKey)
      )) continue;

      edges.push({
        id: edgeId,
        source: a.conceptKey,
        target: b.conceptKey,
        edgeType: "related",
      });
      techPairRelatedCount.set(pairKey, currentCount + 1);
    }
  }

  // ── Phase 4: Fallback cross_tech edges (from tech-relations matrix) ──
  // Uses Level 1 tech relations to create exit→root edges for tech pairs
  // that don't already have explicit cross_tech_links (Phase 3).
  const explicitCrossEdgePairs = new Set(
    edges
      .filter((e) => e.edgeType === "cross_tech")
      .map((e) => {
        const sNode = nodes.find((n) => n.conceptKey === e.source);
        const tNode = nodes.find((n) => n.conceptKey === e.target);
        return sNode && tNode
          ? [sNode.technologyNameNormalized, tNode.technologyNameNormalized].sort().join("↔")
          : "";
      }),
  );

  // For each tech in the graph, check tech-relations for connected techs
  const processedFallbackPairs = new Set<string>();
  for (const row of knowledgeRows) {
    const techNorm = row.technology_name_normalized as string;
    const relations = getRelationsFrom(techNorm);

    for (const rel of relations) {
      // Only foundation/extends create directional fallback edges
      if (rel.relation !== "foundation" && rel.relation !== "extends") continue;

      const pairKey = [rel.source, rel.target].sort().join("↔");
      if (processedFallbackPairs.has(pairKey)) continue;
      if (explicitCrossEdgePairs.has(pairKey)) continue;
      processedFallbackPairs.add(pairKey);

      const sourceRow = techRowMap.get(rel.source);
      const targetRow = techRowMap.get(rel.target);
      if (!sourceRow || !targetRow) continue;

      const sourceConcepts = sourceRow.concepts as ConceptHint[];
      const targetConcepts = targetRow.concepts as ConceptHint[];

      // Root concepts of target: no intra-tech prerequisites
      const rootConcepts = targetConcepts.filter(
        (c) =>
          c.prerequisite_concepts.length === 0 ||
          c.prerequisite_concepts.every(
            (p) => !targetConcepts.some((cc) => cc.concept_key === p),
          ),
      );

      // Exit concepts of source: nothing depends on them within their tech
      const depTargets = new Set(
        sourceConcepts.flatMap((c) => c.prerequisite_concepts),
      );
      const exitConcepts = sourceConcepts.filter(
        (c) => !depTargets.has(c.concept_key),
      );

      const fromConcepts =
        exitConcepts.length > 0 ? exitConcepts : sourceConcepts.slice(-1);

      // Limit: max 3 fallback cross-tech edges per tech pair
      let count = 0;
      for (const source of fromConcepts) {
        if (count >= 3) break;
        for (const target of rootConcepts) {
          if (count >= 3) break;
          if (existingConceptKeys.has(source.concept_key) && existingConceptKeys.has(target.concept_key)) {
            edges.push({
              id: `cross-fallback:${source.concept_key}->${target.concept_key}`,
              source: source.concept_key,
              target: target.concept_key,
              edgeType: "cross_tech",
              relation: rel.relation === "extends" ? "extends" : "foundation",
            });
            count++;
          }
        }
      }
    }
  }

  // ── Phase 5: Difficulty flow edges ────────────────────────────────
  // Connect beginner → intermediate → advanced within same technology + category
  const DIFFICULTY_ORDER: DifficultyTier[] = ["beginner", "intermediate", "advanced"];

  for (const row of knowledgeRows) {
    const concepts = row.concepts as ConceptHint[];
    const byCategory = new Map<string, ConceptHint[]>();

    for (const c of concepts) {
      if (!c.category || !c.difficulty_tier) continue;
      const list = byCategory.get(c.category) ?? [];
      list.push(c);
      byCategory.set(c.category, list);
    }

    for (const [, categoryConcepts] of byCategory) {
      for (let i = 0; i < DIFFICULTY_ORDER.length - 1; i++) {
        const current = categoryConcepts.filter((c) => c.difficulty_tier === DIFFICULTY_ORDER[i]);
        const next = categoryConcepts.filter((c) => c.difficulty_tier === DIFFICULTY_ORDER[i + 1]);

        if (current.length > 0 && next.length > 0) {
          // Connect last of current tier to first of next tier
          const source = current[current.length - 1];
          const target = next[0];
          const edgeId = `diff:${source.concept_key}->${target.concept_key}`;
          // Avoid duplicating prerequisite edges
          if (!edges.some((e) => e.source === source.concept_key && e.target === target.concept_key)) {
            edges.push({
              id: edgeId,
              source: source.concept_key,
              target: target.concept_key,
              edgeType: "difficulty_flow",
            });
          }
        }
      }
    }
  }

  return { nodes, edges, technologies, knowledgeIds, cachedAt: Date.now() };
}

/**
 * Get user's mastery records for all technologies.
 */
export async function getUserMastery(): Promise<{
  success: boolean;
  data?: MasteryRecord[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Join mastery with technology_knowledge to get normalized names
    const { data: masteryRows } = await supabase
      .from("user_concept_mastery")
      .select("knowledge_id, mastery_level")
      .eq("user_id", user.id);

    if (!masteryRows || masteryRows.length === 0) {
      return { success: true, data: [] };
    }

    const knowledgeIds = [...new Set(masteryRows.map((m) => m.knowledge_id))];
    const kbClient = createKBServiceClient();
    const { data: knowledgeRows } = await kbClient
      .from("technology_knowledge")
      .select("id, technology_name_normalized")
      .in("id", knowledgeIds);

    const knowledgeNameMap = new Map<string, string>();
    for (const k of knowledgeRows ?? []) {
      knowledgeNameMap.set(k.id, k.technology_name_normalized);
    }

    const records: MasteryRecord[] = masteryRows.map((m) => ({
      knowledgeId: m.knowledge_id,
      masteryLevel: m.mastery_level,
      technologyNameNormalized: knowledgeNameMap.get(m.knowledge_id) ?? "",
    }));

    return { success: true, data: records };
  } catch {
    return { success: false, error: "Failed to load mastery data" };
  }
}

/**
 * Update mastery for a specific technology or concept.
 * Used for "I already know this" manual toggle.
 * When conceptKey is provided, updates concept-level mastery.
 * When omitted, updates tech-level mastery (legacy).
 */
export async function updateMastery(
  knowledgeId: string,
  masteryLevel: number,
  conceptKey?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (masteryLevel < MASTERY.MIN_LEVEL || masteryLevel > MASTERY.MAX_LEVEL) {
      return { success: false, error: "Mastery level must be 0-100" };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the knowledge entry exists (untyped client for technology_knowledge)
    const kbClient = createKBServiceClient();
    const { data: knowledge } = await kbClient
      .from("technology_knowledge")
      .select("id")
      .eq("id", knowledgeId)
      .single();

    if (!knowledge) {
      return { success: false, error: "Knowledge entry not found" };
    }

    // Use untyped client for mastery operations (last_reviewed_at not in Database types)
    const untypedClient = createKBServiceClient();
    const serviceClient = createServiceClient();

    if (conceptKey) {
      // Concept-level mastery: select existing row by (user_id, knowledge_id, concept_key)
      const { data: existing } = await untypedClient
        .from("user_concept_mastery")
        .select("id")
        .eq("user_id", user.id)
        .eq("knowledge_id", knowledgeId)
        .eq("concept_key", conceptKey)
        .maybeSingle();

      if (existing) {
        const now = new Date().toISOString();
        const { error: updateError } = await untypedClient
          .from("user_concept_mastery")
          .update({
            mastery_level: masteryLevel,
            updated_at: now,
            last_reviewed_at: now,
          })
          .eq("id", existing.id);
        if (updateError) {
          return { success: false, error: "Failed to update mastery" };
        }
      } else {
        const insertNow = new Date().toISOString();
        const { error: insertError } = await untypedClient
          .from("user_concept_mastery")
          .insert({
            user_id: user.id,
            knowledge_id: knowledgeId,
            concept_key: conceptKey,
            mastery_level: masteryLevel,
            updated_at: insertNow,
            last_reviewed_at: insertNow,
          });
        if (insertError) {
          return { success: false, error: "Failed to update mastery" };
        }
      }
    } else {
      // Tech-level mastery upsert (legacy — original unique constraint works)
      const legacyNow = new Date().toISOString();
      const { error: upsertError } = await serviceClient
        .from("user_concept_mastery")
        .upsert(
          {
            user_id: user.id,
            knowledge_id: knowledgeId,
            mastery_level: masteryLevel,
            updated_at: legacyNow,
            last_reviewed_at: legacyNow,
          },
          { onConflict: "user_id,knowledge_id" },
        );

      if (upsertError) {
        return { success: false, error: "Failed to update mastery" };
      }
    }

    // Trigger badge check for concept mastery (non-blocking)
    if (masteryLevel >= MASTERY.MASTERED_THRESHOLD) {
      try {
        await checkAndAwardBadges(user.id, { event: "concept_mastery" });
      } catch (err) {
        console.error("[knowledge-graph] Badge check failed:", err instanceof Error ? err.message : err);
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

/** Behavioral signals collected at module completion for LLM-based mastery evaluation */
export interface MasterySignals {
  quizScore?: number;           // 0-100
  timeSpentMinutes?: number;    // actual time spent
  estimatedMinutes?: number;    // expected time
  tutorMessagesCount?: number;  // tutor conversations during this module
  codeMatchedCount?: number;    // how many concept-matched files exist
  reviewCount?: number;         // how many times previously reviewed
  attempts?: number;            // how many attempts at this module
}

/**
 * Update mastery based on module completion.
 * Called from learning-progress.ts when a module is completed.
 * Traces: module → learning_path → project → tech_stacks → technology_knowledge → mastery
 *
 * Performance: Batch SELECT + batch INSERT/UPDATE instead of N+1 per concept.
 * When signals are provided, uses LLM to evaluate mastery increment in background.
 */
export async function updateMasteryFromModuleCompletion(
  userId: string,
  moduleId: string,
  score: number | undefined,
  signals?: MasterySignals,
): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    const kbClient = createKBServiceClient();

    // Trace module → learning_path → project (include concept_keys for R5' concept-level mastery)
    const { data: moduleData } = await serviceClient
      .from("learning_modules")
      .select("learning_path_id, tech_stack_id, concept_keys")
      .eq("id", moduleId)
      .single();

    if (!moduleData) return;

    const { data: pathData } = await serviceClient
      .from("learning_paths")
      .select("project_id")
      .eq("id", moduleData.learning_path_id)
      .single();

    if (!pathData) return;

    // Get tech stacks + user locale in parallel
    const [techStacksResult, userResult] = await Promise.all([
      serviceClient
        .from("tech_stacks")
        .select("id, technology_name")
        .eq("project_id", pathData.project_id),
      serviceClient.from("users").select("locale").eq("id", userId).single(),
    ]);

    const techStacks = techStacksResult.data;
    if (!techStacks || techStacks.length === 0) return;

    const locale = userResult.data?.locale ?? "ko";

    // Determine target tech names
    let targetTechNames: string[];
    if (moduleData.tech_stack_id) {
      const targetTech = techStacks.find((ts) => ts.id === moduleData.tech_stack_id);
      targetTechNames = targetTech
        ? [targetTech.technology_name.toLowerCase().trim()]
        : techStacks.map((ts) => ts.technology_name.toLowerCase().trim());
    } else {
      targetTechNames = techStacks.map((ts) => ts.technology_name.toLowerCase().trim());
    }

    // Find matching technology_knowledge entries
    const { data: knowledgeRows } = await kbClient
      .from("technology_knowledge")
      .select("id, technology_name_normalized")
      .in("technology_name_normalized", targetTechNames)
      .eq("locale", locale)
      .eq("generation_status", "ready");

    if (!knowledgeRows || knowledgeRows.length === 0) return;

    // Calculate mastery increment based on score
    const increment = score !== undefined
      ? (score >= MASTERY.SCORE_PERFECT ? MASTERY.INCREMENT_SCORE_PERFECT
        : score >= MASTERY.SCORE_HIGH ? MASTERY.INCREMENT_SCORE_HIGH
        : score >= MASTERY.SCORE_PASS ? MASTERY.INCREMENT_SCORE_PASS
        : MASTERY.INCREMENT_BASE)
      : MASTERY.INCREMENT_BASE;

    const conceptKeys = (moduleData.concept_keys as string[] | null) ?? [];
    const knowledgeIds = knowledgeRows.map((r) => r.id);

    if (conceptKeys.length > 0) {
      // ── Batch approach: 1 SELECT → compute diffs → batch INSERT + batch UPDATE ──

      // 1. Batch SELECT: get all existing mastery rows for these knowledge_ids + concept_keys
      // Use untyped client for last_reviewed_at (not in Database types)
      const masteryClient = createKBServiceClient();
      const { data: existingRows } = await masteryClient
        .from("user_concept_mastery")
        .select("id, knowledge_id, concept_key, mastery_level, review_count")
        .eq("user_id", userId)
        .in("knowledge_id", knowledgeIds)
        .in("concept_key", conceptKeys);

      // Build lookup: "knowledgeId:conceptKey" → existing row
      const existingMap = new Map<string, { id: string; mastery_level: number; review_count: number }>();
      for (const row of existingRows ?? []) {
        if (row.concept_key) {
          existingMap.set(`${row.knowledge_id}:${row.concept_key}`, {
            id: row.id,
            mastery_level: row.mastery_level,
            review_count: row.review_count ?? 0,
          });
        }
      }

      // 2. Compute diffs
      const toInsert: Array<{
        user_id: string;
        knowledge_id: string;
        concept_key: string;
        mastery_level: number;
        updated_at: string;
        last_reviewed_at: string;
        review_count: number;
      }> = [];
      const toUpdate: Array<{ id: string; mastery_level: number; updated_at: string; last_reviewed_at: string; review_count: number }> = [];
      const now = new Date().toISOString();

      for (const kRow of knowledgeRows) {
        for (const conceptKey of conceptKeys) {
          const key = `${kRow.id}:${conceptKey}`;
          const existing = existingMap.get(key);
          const currentLevel = existing?.mastery_level ?? 0;
          const newLevel = Math.min(MASTERY.MAX_LEVEL, currentLevel + increment);

          if (existing) {
            const prevReviewCount = existing.review_count ?? 0;
            toUpdate.push({ id: existing.id, mastery_level: newLevel, updated_at: now, last_reviewed_at: now, review_count: prevReviewCount + 1 });
          } else {
            toInsert.push({
              user_id: userId,
              knowledge_id: kRow.id,
              concept_key: conceptKey,
              mastery_level: newLevel,
              updated_at: now,
              last_reviewed_at: now,
              review_count: 1,
            });
          }
        }
      }

      // 3. Batch INSERT + individual UPDATEs (Supabase doesn't support batch update by different IDs)
      const promises: Promise<unknown>[] = [];

      if (toInsert.length > 0) {
        promises.push(
          Promise.resolve(masteryClient.from("user_concept_mastery").insert(toInsert)),
        );
      }

      // Group updates — each needs its own .eq("id") but we can run them in parallel
      for (const upd of toUpdate) {
        promises.push(
          Promise.resolve(
            masteryClient
              .from("user_concept_mastery")
              .update({ mastery_level: upd.mastery_level, updated_at: upd.updated_at, last_reviewed_at: upd.last_reviewed_at, review_count: upd.review_count })
              .eq("id", upd.id),
          ),
        );
      }

      await Promise.all(promises);
    } else {
      // Legacy: tech-level mastery (no concept_keys on module)
      // Use untyped client since review_count is not in Database types
      const legacyClient = createKBServiceClient();
      for (const kRow of knowledgeRows) {
        const { data: existing } = await legacyClient
          .from("user_concept_mastery")
          .select("mastery_level, review_count")
          .eq("user_id", userId)
          .eq("knowledge_id", kRow.id)
          .single();

        const currentLevel = existing?.mastery_level ?? 0;
        const newLevel = Math.min(MASTERY.MAX_LEVEL, currentLevel + increment);
        const prevReviewCount = existing?.review_count ?? 0;

        const legacyNow = new Date().toISOString();
        await legacyClient
          .from("user_concept_mastery")
          .upsert(
            {
              user_id: userId,
              knowledge_id: kRow.id,
              mastery_level: newLevel,
              updated_at: legacyNow,
              last_reviewed_at: legacyNow,
              review_count: prevReviewCount + 1,
            },
            { onConflict: "user_id,knowledge_id" },
          );
      }
    }

    // Trigger badge check for concept mastery (non-blocking)
    if (conceptKeys.length > 0) {
      try {
        await checkAndAwardBadges(userId, { event: "concept_mastery" });
      } catch (err) {
        console.error("[knowledge-graph] Badge check failed:", err instanceof Error ? err.message : err);
      }
    }

    // Background: LLM-based mastery refinement (non-blocking, best-effort)
    if (signals && conceptKeys.length > 0) {
      evaluateMasteryWithLLM(userId, conceptKeys, knowledgeIds, signals).catch((err) => {
        console.error("[knowledge-graph] LLM mastery eval failed:", err instanceof Error ? err.message : err);
      });
    }
  } catch {
    // Non-blocking — mastery update failure should not affect module completion
  }
}

/**
 * LLM-based mastery evaluation — runs in background after module completion.
 * Collects behavioral signals and asks LLM to judge mastery adjustment per concept.
 * Adjusts mastery up or down from the score-based increment already applied.
 */
async function evaluateMasteryWithLLM(
  userId: string,
  conceptKeys: string[],
  knowledgeIds: string[],
  signals: MasterySignals,
): Promise<void> {
  // Get user's LLM key
  const llmKeyResult = await getDefaultLlmKeyWithDiagnosis(userId);
  if (!llmKeyResult.data) return; // No LLM key — skip silently

  const kbClient = createKBServiceClient();

  // Fetch current mastery for these concepts
  const { data: masteryRows } = await kbClient
    .from("user_concept_mastery")
    .select("id, knowledge_id, concept_key, mastery_level, review_count")
    .eq("user_id", userId)
    .in("knowledge_id", knowledgeIds)
    .in("concept_key", conceptKeys);

  if (!masteryRows || masteryRows.length === 0) return;

  const conceptSummary = masteryRows.map((m) => ({
    concept_key: m.concept_key,
    current_mastery: m.mastery_level,
    review_count: m.review_count ?? 0,
  }));

  const prompt = `You are evaluating a student's understanding of programming concepts based on behavioral signals.

## Behavioral Signals
- Quiz score: ${signals.quizScore ?? "N/A"}
- Time spent: ${signals.timeSpentMinutes ?? "N/A"} minutes (expected: ${signals.estimatedMinutes ?? "N/A"} minutes)
- Tutor messages during this module: ${signals.tutorMessagesCount ?? 0}
- Project files matching these concepts: ${signals.codeMatchedCount ?? 0}
- Previous review count: ${signals.reviewCount ?? 0}
- Module attempts: ${signals.attempts ?? 1}

## Concepts to Evaluate
${JSON.stringify(conceptSummary, null, 2)}

## Instructions
For each concept, evaluate the student's TRUE understanding based on ALL signals:
- High quiz score + fast completion + few tutor questions = strong understanding → adjust UP
- High quiz score but very fast (possible guessing) = uncertain → no change
- Low quiz score + many tutor questions = struggling but trying → small adjust UP for effort
- Concept used in project code (codeMatchedCount > 0) + passed quiz = practical understanding → adjust UP
- Multiple attempts = persistence but difficulty → modest adjust

Return a JSON array with adjustments (positive = increase, negative = decrease, range: -10 to +10):
[{"concept_key": "...", "adjustment": 5, "reason": "strong quiz + practical usage"}]

Only return the JSON array, no other text.`;

  try {
    const provider = createLLMProvider(llmKeyResult.data.provider, llmKeyResult.data.apiKey);
    const result = await provider.chat({
      messages: [
        { role: "system", content: "You are a learning assessment AI. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      maxTokens: 500,
    });

    // Parse LLM response
    const jsonMatch = result.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const adjustments: Array<{ concept_key: string; adjustment: number }> = JSON.parse(jsonMatch[0]);

    // Apply adjustments (clamped to -10..+10)
    for (const adj of adjustments) {
      if (!adj.concept_key || typeof adj.adjustment !== "number") continue;
      const clampedAdj = Math.max(-10, Math.min(10, Math.round(adj.adjustment)));
      if (clampedAdj === 0) continue;

      const row = masteryRows.find((m) => m.concept_key === adj.concept_key);
      if (!row) continue;

      const newLevel = Math.max(MASTERY.MIN_LEVEL, Math.min(MASTERY.MAX_LEVEL, row.mastery_level + clampedAdj));
      if (newLevel === row.mastery_level) continue;

      await kbClient
        .from("user_concept_mastery")
        .update({ mastery_level: newLevel, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }
  } catch {
    // LLM eval is best-effort — failure should not propagate
  }
}

/**
 * Find modules that teach a specific concept.
 * Uses GIN index on learning_modules.concept_keys.
 */
export async function getModulesForConcept(
  conceptKey: string,
  projectId: string,
): Promise<{
  modules: { id: string; pathId: string; title: string; status: string }[];
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { modules: [] };
    }

    // Get learning paths for this project
    const { data: paths } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!paths || paths.length === 0) return { modules: [] };

    const pathIds = paths.map((p) => p.id);

    // Find modules + progress in parallel
    const { data: modules } = await supabase
      .from("learning_modules")
      .select("id, learning_path_id, title")
      .in("learning_path_id", pathIds)
      .contains("concept_keys", [conceptKey])
      .order("module_order", { ascending: true });

    if (!modules || modules.length === 0) return { modules: [] };

    const moduleIds = modules.map((m) => m.id);
    const { data: progress } = await supabase
      .from("learning_progress")
      .select("module_id, status")
      .eq("user_id", user.id)
      .in("module_id", moduleIds);

    const progressMap = new Map<string, string>();
    for (const p of progress ?? []) {
      progressMap.set(p.module_id, p.status);
    }

    return {
      modules: modules.map((m) => ({
        id: m.id,
        pathId: m.learning_path_id,
        title: m.title,
        status: progressMap.get(m.id) ?? "not_started",
      })),
    };
  } catch {
    return { modules: [] };
  }
}

// ── Weak Concept Recommendations ────────────────────────────────────

export interface WeakConceptRecommendation {
  conceptKey: string;
  conceptName: string;
  techName: string;
  level: number;
  relatedModules: Array<{ id: string; pathId: string; title: string; status: string }>;
}

/**
 * Returns concepts where the user's mastery is below MASTERED_THRESHOLD,
 * along with related modules they can study to improve.
 * Optimized: parallel queries, single modules fetch with overlaps filter.
 */
export async function getWeakConceptRecommendations(
  projectId: string,
  limit = 5,
): Promise<{ recommendations: WeakConceptRecommendation[] }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { recommendations: [] };
    }

    // Parallel: get tech stacks + all user mastery
    const [techStacksResult, masteryResult] = await Promise.all([
      supabase
        .from("tech_stacks")
        .select("technology_name")
        .eq("project_id", projectId),
      createKBServiceClient()
        .from("user_concept_mastery")
        .select("concept_key, mastery_level, knowledge_id, last_reviewed_at, review_count")
        .eq("user_id", user.id),
    ]);

    const techStacks = techStacksResult.data;
    const allMastery = masteryResult.data;

    if (!techStacks || techStacks.length === 0) return { recommendations: [] };
    if (!allMastery || allMastery.length === 0) return { recommendations: [] };

    const techNames = techStacks.map((t) => t.technology_name);

    // Get KB data to resolve concept names
    const kbClient = createKBServiceClient();
    const knowledgeIds = [...new Set(allMastery.map((m) => m.knowledge_id))];
    const { data: kbRows } = await kbClient
      .from("technology_knowledge")
      .select("id, technology_name, concepts")
      .in("id", knowledgeIds);

    // Build lookup
    const conceptLookup = new Map<string, { conceptName: string; techName: string }>();
    for (const kb of kbRows ?? []) {
      const concepts = (kb.concepts as ConceptHint[]) ?? [];
      for (const c of concepts) {
        conceptLookup.set(`${kb.id}:${c.concept_key}`, {
          conceptName: c.concept_name,
          techName: kb.technology_name,
        });
      }
    }

    // Filter weak concepts (with adaptive Ebbinghaus decay)
    const weakConcepts = allMastery
      .map((m) => {
        const daysSinceReview = m.last_reviewed_at
          ? (Date.now() - new Date(m.last_reviewed_at as string).getTime()) / (1000 * 60 * 60 * 24)
          : 0;
        const lambda = adaptiveLambda(m.review_count ?? 0);
        const decayFactor = Math.exp(-lambda * daysSinceReview);
        const effectiveMastery = m.mastery_level * decayFactor;
        return { ...m, effectiveMastery };
      })
      .filter((m) => {
        if (!m.concept_key || m.effectiveMastery >= MASTERY.MASTERED_THRESHOLD) return false;
        const lookup = conceptLookup.get(`${m.knowledge_id}:${m.concept_key}`);
        return lookup && techNames.includes(lookup.techName);
      })
      .sort((a, b) => a.effectiveMastery - b.effectiveMastery)
      .slice(0, limit)
      .map((m) => {
        const lookup = conceptLookup.get(`${m.knowledge_id}:${m.concept_key}`)!;
        return {
          concept_key: m.concept_key!,
          concept_name: lookup.conceptName,
          tech_name: lookup.techName,
          level: Math.round(m.effectiveMastery),
        };
      });

    if (weakConcepts.length === 0) return { recommendations: [] };

    // Get paths + modules + progress in parallel
    const { data: paths } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!paths || paths.length === 0) {
      return {
        recommendations: weakConcepts.map((c) => ({
          conceptKey: c.concept_key,
          conceptName: c.concept_name,
          techName: c.tech_name,
          level: c.level,
          relatedModules: [],
        })),
      };
    }

    const pathIds = paths.map((p) => p.id);
    const weakConceptKeys = weakConcepts.map((c) => c.concept_key);

    // Single query: get modules that overlap with ANY weak concept key
    const { data: modules } = await supabase
      .from("learning_modules")
      .select("id, learning_path_id, title, concept_keys")
      .in("learning_path_id", pathIds)
      .overlaps("concept_keys", weakConceptKeys)
      .order("module_order", { ascending: true });

    // Get progress for matched modules
    const allModuleIds = (modules ?? []).map((m) => m.id);
    const { data: progress } = allModuleIds.length > 0
      ? await supabase
          .from("learning_progress")
          .select("module_id, status")
          .eq("user_id", user.id)
          .in("module_id", allModuleIds)
      : { data: [] };

    const progressMap = new Map<string, string>();
    for (const p of progress ?? []) {
      progressMap.set(p.module_id, p.status);
    }

    // Match modules to concepts
    const recommendations: WeakConceptRecommendation[] = weakConcepts.map((c) => {
      const relatedModules = (modules ?? [])
        .filter((m) => {
          const keys = m.concept_keys as string[] | null;
          return keys?.includes(c.concept_key);
        })
        .map((m) => ({
          id: m.id,
          pathId: m.learning_path_id,
          title: m.title,
          status: progressMap.get(m.id) ?? "not_started",
        }));

      return {
        conceptKey: c.concept_key,
        conceptName: c.concept_name,
        techName: c.tech_name,
        level: c.level,
        relatedModules,
      };
    });

    return { recommendations };
  } catch {
    return { recommendations: [] };
  }
}

// ── Recommended Next Concepts ────────────────────────────────────

export interface NextConceptRecommendation {
  conceptKey: string;
  conceptName: string;
  techName: string;
  effectiveMastery: number;
  readinessScore: number;
  matchedFileCount?: number;
}

/**
 * Returns the top N "next best concepts to learn" for a project.
 * Readiness = (mastered prerequisites / total prerequisites).
 * Priority = readiness * (1 - effectiveMastery/100).
 */
export async function getRecommendedNextConcepts(
  projectId: string,
  limit = 3,
): Promise<{ recommendations: NextConceptRecommendation[] }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { recommendations: [] };
    }

    // Get tech stacks for project
    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select("technology_name")
      .eq("project_id", projectId);

    if (!techStacks || techStacks.length === 0) return { recommendations: [] };

    const normalizedNames = techStacks.map((ts) =>
      ts.technology_name.toLowerCase().trim(),
    );

    // Get user locale
    const { data: userData } = await supabase
      .from("users")
      .select("locale")
      .eq("id", user.id)
      .single();

    const locale = userData?.locale ?? "ko";

    // Fetch KB entries
    const kbClient = createKBServiceClient();
    const { data: kbRows } = await kbClient
      .from("technology_knowledge")
      .select("id, technology_name, technology_name_normalized, concepts")
      .in("technology_name_normalized", normalizedNames)
      .eq("locale", locale)
      .eq("generation_status", "ready");

    if (!kbRows || kbRows.length === 0) return { recommendations: [] };

    const knowledgeIds = kbRows.map((r) => r.id);

    // Get user mastery with last_reviewed_at
    const { data: masteryRows } = await createKBServiceClient()
      .from("user_concept_mastery")
      .select("knowledge_id, concept_key, mastery_level, last_reviewed_at, review_count")
      .eq("user_id", user.id)
      .in("knowledge_id", knowledgeIds);

    // Build mastery lookup: "knowledgeId:conceptKey" → { mastery_level, last_reviewed_at, review_count }
    const masteryMap = new Map<string, { mastery_level: number; last_reviewed_at: string | null; review_count: number }>();
    for (const m of masteryRows ?? []) {
      if (m.concept_key) {
        masteryMap.set(`${m.knowledge_id}:${m.concept_key}`, {
          mastery_level: m.mastery_level,
          last_reviewed_at: m.last_reviewed_at,
          review_count: m.review_count ?? 0,
        });
      }
    }

    // Build all concepts list + compute effective mastery + readiness
    const candidates: NextConceptRecommendation[] = [];

    for (const kb of kbRows) {
      const concepts = (kb.concepts as ConceptHint[]) ?? [];

      // Precompute effective mastery for all concepts in this KB entry
      const effectiveMasteryMap = new Map<string, number>();
      for (const c of concepts) {
        const record = masteryMap.get(`${kb.id}:${c.concept_key}`);
        const rawMastery = record?.mastery_level ?? 0;
        const daysSinceReview = record?.last_reviewed_at
          ? (Date.now() - new Date(record.last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24)
          : 0;
        const lambda = adaptiveLambda(record?.review_count ?? 0);
        const decayFactor = Math.exp(-lambda * daysSinceReview);
        effectiveMasteryMap.set(c.concept_key, rawMastery * decayFactor);
      }

      for (const c of concepts) {
        const effectiveMastery = effectiveMasteryMap.get(c.concept_key) ?? 0;

        // Skip already mastered
        if (effectiveMastery >= MASTERY.MASTERED_THRESHOLD) continue;

        // Calculate readiness: mastered prerequisites / total prerequisites
        let readiness = 1.0;
        if (c.prerequisite_concepts.length > 0) {
          const masteredPrereqs = c.prerequisite_concepts.filter((prereq) => {
            const prereqEffective = effectiveMasteryMap.get(prereq) ?? 0;
            return prereqEffective >= MASTERY.MASTERED_THRESHOLD;
          }).length;
          readiness = masteredPrereqs / c.prerequisite_concepts.length;
        }

        const priority = readiness * (1 - effectiveMastery / 100);

        candidates.push({
          conceptKey: c.concept_key,
          conceptName: c.concept_name,
          techName: kb.technology_name,
          effectiveMastery: Math.round(effectiveMastery),
          readinessScore: Math.round(priority * 100) / 100,
        });
      }
    }

    // Sort by priority (readinessScore) descending, take top N
    candidates.sort((a, b) => b.readinessScore - a.readinessScore);
    const top = candidates.slice(0, limit);

    // Enrich with code match file counts (non-blocking, best-effort)
    try {
      const matchScores = await getConceptMatchScores(projectId);
      if (matchScores.size > 0) {
        for (const rec of top) {
          const match = matchScores.get(rec.conceptKey);
          if (match) {
            rec.matchedFileCount = match.files.length;
          }
        }
      }
    } catch {
      // Code match enrichment is optional
    }

    return { recommendations: top };
  } catch {
    return { recommendations: [] };
  }
}

// ── Tech Progress Overview ───────────────────────────────────────

export interface TechProgress {
  name: string;
  totalConcepts: number;
  masteredConcepts: number;
  avgMastery: number;
  progress: number;
}

export interface CrossTechReadinessEntry {
  targetTech: string;
  sourceTech: string;
  readiness: number;
  relation: string;
}

/**
 * Returns per-technology mastery progress + cross-tech readiness.
 */
export async function getTechProgressOverview(
  projectId: string,
): Promise<{
  technologies: TechProgress[];
  crossTechReadiness: CrossTechReadinessEntry[];
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { technologies: [], crossTechReadiness: [] };
    }

    // Get tech stacks + locale
    const [techStacksResult, userResult] = await Promise.all([
      supabase
        .from("tech_stacks")
        .select("technology_name")
        .eq("project_id", projectId),
      supabase.from("users").select("locale").eq("id", user.id).single(),
    ]);

    const techStacks = techStacksResult.data;
    if (!techStacks || techStacks.length === 0) {
      return { technologies: [], crossTechReadiness: [] };
    }

    const locale = userResult.data?.locale ?? "ko";
    const normalizedNames = techStacks.map((ts) =>
      ts.technology_name.toLowerCase().trim(),
    );

    // Fetch KB entries
    const kbClient = createKBServiceClient();
    const { data: kbRows } = await kbClient
      .from("technology_knowledge")
      .select("id, technology_name, technology_name_normalized, concepts, prerequisites")
      .in("technology_name_normalized", normalizedNames)
      .eq("locale", locale)
      .eq("generation_status", "ready");

    if (!kbRows || kbRows.length === 0) {
      return { technologies: [], crossTechReadiness: [] };
    }

    const knowledgeIds = kbRows.map((r) => r.id);

    // Get user mastery with last_reviewed_at
    const { data: masteryRows } = await createKBServiceClient()
      .from("user_concept_mastery")
      .select("knowledge_id, concept_key, mastery_level, last_reviewed_at, review_count")
      .eq("user_id", user.id)
      .in("knowledge_id", knowledgeIds);

    // Build mastery lookup
    const masteryMap = new Map<string, { mastery_level: number; last_reviewed_at: string | null; review_count: number }>();
    for (const m of masteryRows ?? []) {
      if (m.concept_key) {
        masteryMap.set(`${m.knowledge_id}:${m.concept_key}`, {
          mastery_level: m.mastery_level,
          last_reviewed_at: m.last_reviewed_at,
          review_count: m.review_count ?? 0,
        });
      }
    }

    // Per-technology progress
    const techProgressMap = new Map<string, TechProgress>();
    const technologies: TechProgress[] = [];

    for (const kb of kbRows) {
      const concepts = (kb.concepts as ConceptHint[]) ?? [];
      const totalConcepts = concepts.length;
      let masteredConcepts = 0;
      let totalEffective = 0;

      for (const c of concepts) {
        const record = masteryMap.get(`${kb.id}:${c.concept_key}`);
        const rawMastery = record?.mastery_level ?? 0;
        const daysSinceReview = record?.last_reviewed_at
          ? (Date.now() - new Date(record.last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24)
          : 0;
        const lambda = adaptiveLambda(record?.review_count ?? 0);
        const decayFactor = Math.exp(-lambda * daysSinceReview);
        const effectiveMastery = rawMastery * decayFactor;

        totalEffective += effectiveMastery;
        if (effectiveMastery >= MASTERY.MASTERED_THRESHOLD) {
          masteredConcepts++;
        }
      }

      const avgMastery = totalConcepts > 0 ? Math.round(totalEffective / totalConcepts) : 0;
      const progress = totalConcepts > 0 ? Math.round((masteredConcepts / totalConcepts) * 100) : 0;

      const entry: TechProgress = {
        name: kb.technology_name,
        totalConcepts,
        masteredConcepts,
        avgMastery,
        progress,
      };
      technologies.push(entry);
      techProgressMap.set(kb.technology_name_normalized, entry);
    }

    // Cross-tech readiness: for techs with prerequisites, compute avg progress of source techs
    const crossTechReadiness: CrossTechReadinessEntry[] = [];

    for (const kb of kbRows) {
      const prereqs = (kb.prerequisites as string[] | null) ?? [];
      for (const prereqNormalized of prereqs) {
        const sourceProgress = techProgressMap.get(prereqNormalized);
        if (!sourceProgress) continue;

        crossTechReadiness.push({
          targetTech: kb.technology_name,
          sourceTech: sourceProgress.name,
          readiness: sourceProgress.progress,
          relation: "prerequisite",
        });
      }
    }

    return { technologies, crossTechReadiness };
  } catch {
    return { technologies: [], crossTechReadiness: [] };
  }
}

// ── Review Needed Concepts ───────────────────────────────────────

export interface ReviewNeededConcept {
  conceptKey: string;
  conceptName: string;
  techName: string;
  rawMastery: number;
  effectiveMastery: number;
  daysSinceReview: number;
}

/**
 * Returns concepts that were mastered but have decayed below threshold.
 * These are candidates for spaced repetition review.
 */
export async function getReviewNeededConcepts(
  projectId: string,
  limit = 5,
): Promise<{ concepts: ReviewNeededConcept[] }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { concepts: [] };

    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select("technology_name")
      .eq("project_id", projectId);

    if (!techStacks || techStacks.length === 0) return { concepts: [] };

    const normalizedNames = techStacks.map((ts) => ts.technology_name.toLowerCase().trim());

    const { data: userData } = await supabase
      .from("users")
      .select("locale")
      .eq("id", user.id)
      .single();

    const locale = userData?.locale ?? "ko";

    const kbClient = createKBServiceClient();
    const { data: kbRows } = await kbClient
      .from("technology_knowledge")
      .select("id, technology_name, concepts")
      .in("technology_name_normalized", normalizedNames)
      .eq("locale", locale)
      .eq("generation_status", "ready");

    if (!kbRows || kbRows.length === 0) return { concepts: [] };

    const knowledgeIds = kbRows.map((r) => r.id);

    const { data: masteryRows } = await createKBServiceClient()
      .from("user_concept_mastery")
      .select("knowledge_id, concept_key, mastery_level, last_reviewed_at, review_count")
      .eq("user_id", user.id)
      .in("knowledge_id", knowledgeIds);

    if (!masteryRows || masteryRows.length === 0) return { concepts: [] };

    // Build concept name lookup
    const conceptLookup = new Map<string, { conceptName: string; techName: string }>();
    for (const kb of kbRows) {
      for (const c of (kb.concepts as ConceptHint[]) ?? []) {
        conceptLookup.set(`${kb.id}:${c.concept_key}`, {
          conceptName: c.concept_name,
          techName: kb.technology_name,
        });
      }
    }

    // Find concepts where raw mastery >= threshold but effective < threshold
    const reviewNeeded: ReviewNeededConcept[] = [];

    for (const m of masteryRows) {
      if (!m.concept_key || m.mastery_level < MASTERY.MASTERED_THRESHOLD) continue;

      const daysSinceReview = m.last_reviewed_at
        ? (Date.now() - new Date(m.last_reviewed_at as string).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      // Only flag if enough time has passed for meaningful decay
      if (daysSinceReview < 3) continue;

      const lambda = adaptiveLambda(m.review_count ?? 0);
      const decayFactor = Math.exp(-lambda * daysSinceReview);
      const effectiveMastery = m.mastery_level * decayFactor;

      if (effectiveMastery >= MASTERY.MASTERED_THRESHOLD) continue;

      const lookup = conceptLookup.get(`${m.knowledge_id}:${m.concept_key}`);
      if (!lookup) continue;

      reviewNeeded.push({
        conceptKey: m.concept_key,
        conceptName: lookup.conceptName,
        techName: lookup.techName,
        rawMastery: m.mastery_level,
        effectiveMastery: Math.round(effectiveMastery),
        daysSinceReview: Math.round(daysSinceReview),
      });
    }

    // Sort by most decayed first
    reviewNeeded.sort((a, b) => a.effectiveMastery - b.effectiveMastery);
    return { concepts: reviewNeeded.slice(0, limit) };
  } catch {
    return { concepts: [] };
  }
}

// ── Concept Matches for Module ───────────────────────────────────

export interface ModuleConceptMatch {
  conceptKey: string;
  conceptName: string;
  matchedFiles: string[];
}

/**
 * Returns code-matched files for concepts covered by a specific module.
 * Used to show "This concept appears in your project" banners.
 */
export async function getConceptMatchesForModule(
  projectId: string,
  conceptKeys: string[],
): Promise<{ matches: ModuleConceptMatch[] }> {
  if (conceptKeys.length === 0) return { matches: [] };

  try {
    const matchScores = await getConceptMatchScores(projectId);
    if (matchScores.size === 0) return { matches: [] };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { matches: [] };

    // Get locale + KB for concept name resolution
    const { data: userData } = await supabase
      .from("users")
      .select("locale")
      .eq("id", user.id)
      .single();

    const locale = userData?.locale ?? "ko";

    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select("technology_name")
      .eq("project_id", projectId);

    if (!techStacks || techStacks.length === 0) return { matches: [] };

    const normalizedNames = techStacks.map((ts) => ts.technology_name.toLowerCase().trim());

    const kbClient = createKBServiceClient();
    const { data: kbRows } = await kbClient
      .from("technology_knowledge")
      .select("concepts")
      .in("technology_name_normalized", normalizedNames)
      .eq("locale", locale)
      .eq("generation_status", "ready");

    // Build concept name lookup
    const nameMap = new Map<string, string>();
    for (const kb of kbRows ?? []) {
      for (const c of (kb.concepts as ConceptHint[]) ?? []) {
        nameMap.set(c.concept_key, c.concept_name);
      }
    }

    const matches: ModuleConceptMatch[] = [];
    for (const key of conceptKeys) {
      const match = matchScores.get(key);
      if (match && match.files.length > 0) {
        matches.push({
          conceptKey: key,
          conceptName: nameMap.get(key) ?? key,
          matchedFiles: match.files,
        });
      }
    }

    return { matches };
  } catch {
    return { matches: [] };
  }
}

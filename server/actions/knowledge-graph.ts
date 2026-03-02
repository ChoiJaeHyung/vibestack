"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ConceptHint } from "@/lib/knowledge/types";

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
}

export interface ConceptGraphEdge {
  id: string;
  source: string; // concept_key
  target: string; // concept_key
  edgeType: "prerequisite" | "cross_tech";
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

// ── Server Actions ──────────────────────────────────────────────────

/**
 * Build the concept graph for a project.
 * Uses the project's tech_stacks to find related technology_knowledge entries,
 * then constructs nodes (individual concepts) and edges (prerequisite relationships).
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

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    // Get project's tech stacks
    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select("technology_name")
      .eq("project_id", projectId);

    if (!techStacks || techStacks.length === 0) {
      return {
        success: true,
        data: { nodes: [], edges: [], technologies: [] },
      };
    }

    // Get user locale
    const { data: userData } = await supabase
      .from("users")
      .select("locale")
      .eq("id", user.id)
      .single();

    const locale = userData?.locale ?? "ko";

    // Normalize tech names for matching
    const normalizedNames = techStacks.map((ts) =>
      ts.technology_name.toLowerCase().trim(),
    );

    // Fetch matching technology_knowledge entries (use untyped client — not in Database type)
    const kbClient = createKBServiceClient();
    const { data: knowledgeRows } = await kbClient
      .from("technology_knowledge")
      .select("id, technology_name, technology_name_normalized, concepts, prerequisites, locale")
      .in("technology_name_normalized", normalizedNames)
      .eq("locale", locale)
      .eq("generation_status", "ready");

    if (!knowledgeRows || knowledgeRows.length === 0) {
      return {
        success: true,
        data: { nodes: [], edges: [], technologies: [] },
      };
    }

    // Get user mastery data
    const knowledgeIds = knowledgeRows.map((r) => r.id);
    const { data: masteryRows } = await supabase
      .from("user_concept_mastery")
      .select("knowledge_id, mastery_level")
      .eq("user_id", user.id)
      .in("knowledge_id", knowledgeIds);

    const masteryMap = new Map<string, number>();
    for (const m of masteryRows ?? []) {
      masteryMap.set(m.knowledge_id, m.mastery_level);
    }

    // Build a map of technology_name_normalized → knowledge row
    const techMap = new Map<string, typeof knowledgeRows[number]>();
    for (const row of knowledgeRows) {
      techMap.set(row.technology_name_normalized, row);
    }

    // Build concept graph nodes and edges
    const nodes: ConceptGraphNode[] = [];
    const edges: ConceptGraphEdge[] = [];
    const technologies: string[] = [];

    // Track which concept_keys exist to avoid dangling edges
    const existingConceptKeys = new Set<string>();

    for (const row of knowledgeRows) {
      technologies.push(row.technology_name);
      const concepts = row.concepts as ConceptHint[];
      const techMastery = masteryMap.get(row.id) ?? 0;

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
          masteryLevel: techMastery,
        });
      }
    }

    // Build intra-tech edges (prerequisite_concepts within same technology)
    for (const row of knowledgeRows) {
      const concepts = row.concepts as ConceptHint[];
      for (const concept of concepts) {
        for (const prereq of concept.prerequisite_concepts) {
          if (existingConceptKeys.has(prereq)) {
            edges.push({
              id: `${prereq}->${concept.concept_key}`,
              source: prereq,
              target: concept.concept_key,
              edgeType: "prerequisite",
            });
          }
        }
      }
    }

    // Build cross-tech edges (inter-technology prerequisites)
    // e.g., Next.js depends on React → connect Next.js root concepts to React root concepts
    for (const row of knowledgeRows) {
      const prereqs = (row.prerequisites as string[] | null) ?? [];
      for (const prereqNormalized of prereqs) {
        const prereqRow = techMap.get(prereqNormalized);
        if (!prereqRow) continue;

        const prereqConcepts = prereqRow.concepts as ConceptHint[];
        const currentConcepts = row.concepts as ConceptHint[];

        // Find root concepts (ones with no intra-tech prerequisites) in the current tech
        const rootConcepts = currentConcepts.filter(
          (c) =>
            c.prerequisite_concepts.length === 0 ||
            c.prerequisite_concepts.every(
              (p) => !currentConcepts.some((cc) => cc.concept_key === p),
            ),
        );

        // Find "exit" concepts (ones nothing depends on) in the prereq tech
        const depTargets = new Set(
          prereqConcepts.flatMap((c) => c.prerequisite_concepts),
        );
        const exitConcepts = prereqConcepts.filter(
          (c) => !depTargets.has(c.concept_key),
        );

        // If no clear exit concepts, use the last concept
        const sourceConcepts =
          exitConcepts.length > 0
            ? exitConcepts
            : prereqConcepts.slice(-1);

        for (const source of sourceConcepts) {
          for (const target of rootConcepts) {
            if (existingConceptKeys.has(source.concept_key) && existingConceptKeys.has(target.concept_key)) {
              edges.push({
                id: `cross:${source.concept_key}->${target.concept_key}`,
                source: source.concept_key,
                target: target.concept_key,
                edgeType: "cross_tech",
              });
            }
          }
        }
      }
    }

    return {
      success: true,
      data: { nodes, edges, technologies },
    };
  } catch {
    return { success: false, error: "Failed to load concept graph" };
  }
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

    const knowledgeIds = masteryRows.map((m) => m.knowledge_id);
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
 * Update mastery for a specific technology.
 * Used for "I already know this" manual toggle.
 */
export async function updateMastery(
  knowledgeId: string,
  masteryLevel: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (masteryLevel < 0 || masteryLevel > 100) {
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

    // Upsert mastery (use typed service client for user_concept_mastery)
    const serviceClient = createServiceClient();
    const { error: upsertError } = await serviceClient
      .from("user_concept_mastery")
      .upsert(
        {
          user_id: user.id,
          knowledge_id: knowledgeId,
          mastery_level: masteryLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,knowledge_id" },
      );

    if (upsertError) {
      return { success: false, error: "Failed to update mastery" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update mastery based on module completion.
 * Called from learning-progress.ts when a module is completed.
 * Traces: module → learning_path → project → tech_stacks → technology_knowledge → mastery
 */
export async function updateMasteryFromModuleCompletion(
  userId: string,
  moduleId: string,
  score: number | undefined,
): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    const kbClient = createKBServiceClient();

    // Trace module → learning_path → project
    const { data: moduleData } = await serviceClient
      .from("learning_modules")
      .select("learning_path_id, tech_stack_id")
      .eq("id", moduleId)
      .single();

    if (!moduleData) return;

    const { data: pathData } = await serviceClient
      .from("learning_paths")
      .select("project_id")
      .eq("id", moduleData.learning_path_id)
      .single();

    if (!pathData) return;

    // Get all tech stacks for the project
    const { data: techStacks } = await serviceClient
      .from("tech_stacks")
      .select("id, technology_name")
      .eq("project_id", pathData.project_id);

    if (!techStacks || techStacks.length === 0) return;

    // If module has a specific tech_stack_id, only update that tech
    // Otherwise, update all project tech stacks proportionally
    let targetTechNames: string[];

    if (moduleData.tech_stack_id) {
      const targetTech = techStacks.find(
        (ts) => ts.id === moduleData.tech_stack_id,
      );
      targetTechNames = targetTech
        ? [targetTech.technology_name.toLowerCase().trim()]
        : techStacks.map((ts) => ts.technology_name.toLowerCase().trim());
    } else {
      targetTechNames = techStacks.map((ts) =>
        ts.technology_name.toLowerCase().trim(),
      );
    }

    // Get user locale
    const { data: userData } = await serviceClient
      .from("users")
      .select("locale")
      .eq("id", userId)
      .single();

    const locale = userData?.locale ?? "ko";

    // Find matching technology_knowledge entries (untyped client)
    const { data: knowledgeRows } = await kbClient
      .from("technology_knowledge")
      .select("id, technology_name_normalized")
      .in("technology_name_normalized", targetTechNames)
      .eq("locale", locale)
      .eq("generation_status", "ready");

    if (!knowledgeRows || knowledgeRows.length === 0) return;

    // Calculate mastery increment based on score
    // score 100 → +25, score 80 → +20, score 60 → +15, no score → +10
    const increment = score !== undefined
      ? (score >= 100 ? 25 : score >= 80 ? 20 : score >= 60 ? 15 : 10)
      : 10;

    // Upsert mastery for each matching technology
    for (const kRow of knowledgeRows) {
      // Get current mastery
      const { data: existing } = await serviceClient
        .from("user_concept_mastery")
        .select("mastery_level")
        .eq("user_id", userId)
        .eq("knowledge_id", kRow.id)
        .single();

      const currentLevel = existing?.mastery_level ?? 0;
      const newLevel = Math.min(100, currentLevel + increment);

      await serviceClient
        .from("user_concept_mastery")
        .upsert(
          {
            user_id: userId,
            knowledge_id: kRow.id,
            mastery_level: newLevel,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,knowledge_id" },
        );
    }
  } catch {
    // Non-blocking — mastery update failure should not affect module completion
  }
}

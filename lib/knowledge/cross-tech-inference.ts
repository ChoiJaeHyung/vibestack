import type { ConceptHint, CrossTechLink, TechRelation } from "./types";
import { getRelationsFrom } from "./tech-relations";
import { createLLMProvider } from "@/lib/llm/factory";

/**
 * Level 3: LLM-based cross-tech link generation.
 *
 * Uses technology relations (Level 1) and standardized domains (Level 2)
 * as context for LLM to generate concept-level cross_tech_links.
 *
 * Key design:
 * - LLM does semantic matching, NOT structural auto-inference
 * - Tech relations + domain categories are context, not auto-matchers
 * - Generates directional links with relation types
 * - Batched by tech pair to control cost
 */

export interface CrossTechCandidate {
  sourceTech: string;
  sourceConceptKey: string;
  targetTech: string;
  targetConceptKey: string;
  relation: CrossTechLink["relation"];
  reason: string;
}

interface TechConceptSummary {
  tech: string;
  concepts: Array<{
    concept_key: string;
    concept_name: string;
    category: string;
    difficulty_tier: string;
    tags: string[];
    key_points: string[];
  }>;
}

/**
 * Generate cross-tech links between two technologies using LLM.
 * Returns validated candidates with concept_key existence checks.
 */
export async function generateCrossTechLinks(
  sourceTech: TechConceptSummary,
  targetTech: TechConceptSummary,
  provider: ReturnType<typeof createLLMProvider>,
): Promise<CrossTechCandidate[]> {
  // Get the tech-level relation between these two techs
  const techRelation = getRelationsFrom(sourceTech.tech.toLowerCase())
    .find(r => r.target === targetTech.tech.toLowerCase());

  const prompt = buildPrompt(sourceTech, targetTech, techRelation);

  try {
    const result = await provider.chat({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 4000,
    });

    const candidates = parseResponse(result.content, sourceTech, targetTech);

    // Validate: ensure all concept_keys actually exist
    const sourceKeys = new Set(sourceTech.concepts.map(c => c.concept_key));
    const targetKeys = new Set(targetTech.concepts.map(c => c.concept_key));

    return candidates.filter(c => {
      const sourceExists = sourceKeys.has(c.sourceConceptKey) || targetKeys.has(c.sourceConceptKey);
      const targetExists = targetKeys.has(c.targetConceptKey) || sourceKeys.has(c.targetConceptKey);
      return sourceExists && targetExists;
    });
  } catch (err) {
    console.error(
      `[cross-tech-inference] LLM failed for ${sourceTech.tech}↔${targetTech.tech}:`,
      err,
    );
    return [];
  }
}

/**
 * Batch generate cross-tech links for all related tech pairs in the KB.
 * Only generates for tech pairs that have a TechRelation defined.
 * Uses parallel batching (concurrency 3) to stay within Vercel timeout.
 */
export async function batchGenerateCrossTechLinks(
  allTechs: TechConceptSummary[],
  provider: ReturnType<typeof createLLMProvider>,
): Promise<CrossTechCandidate[]> {
  // Build lookup with normalized name aliases
  const techMap = new Map<string, TechConceptSummary>();
  for (const t of allTechs) {
    const norm = t.tech.toLowerCase();
    techMap.set(norm, t);
    // Register common aliases so tech-relations names can find DB entries
    const alias = TECH_NAME_ALIASES[norm];
    if (alias) techMap.set(alias, t);
    // Reverse: if this tech is an alias target, register the source
    for (const [k, v] of Object.entries(TECH_NAME_ALIASES)) {
      if (v === norm) techMap.set(k, t);
    }
  }

  // Collect unique pairs to process
  const processedPairs = new Set<string>();
  const pairs: Array<{ source: TechConceptSummary; target: TechConceptSummary }> = [];

  for (const tech of allTechs) {
    const norm = tech.tech.toLowerCase();
    // Try both the original name and any aliases
    const namesToTry = [norm];
    const alias = TECH_NAME_ALIASES[norm];
    if (alias) namesToTry.push(alias);
    for (const [k, v] of Object.entries(TECH_NAME_ALIASES)) {
      if (v === norm) namesToTry.push(k);
    }

    for (const name of namesToTry) {
      const relations = getRelationsFrom(name);
      for (const rel of relations) {
        if (rel.strength < 0.4) continue;

        const pairKey = [rel.source, rel.target].sort().join("↔");
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const sourceSummary = techMap.get(rel.source);
        const targetSummary = techMap.get(rel.target);
        if (!sourceSummary || !targetSummary) continue;

        pairs.push({ source: sourceSummary, target: targetSummary });
      }
    }
  }

  // Process in parallel batches of 3 to stay within timeout
  const CONCURRENCY = 3;
  const allCandidates: CrossTechCandidate[] = [];

  for (let i = 0; i < pairs.length; i += CONCURRENCY) {
    const batch = pairs.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(({ source, target }) =>
        generateCrossTechLinks(source, target, provider),
      ),
    );
    for (const candidates of results) {
      allCandidates.push(...candidates);
    }
  }

  // Dedup: same source→target pair should only have one link
  const seen = new Set<string>();
  return allCandidates.filter(c => {
    const key = `${c.sourceConceptKey}→${c.targetConceptKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Common aliases between tech-relations names and DB normalized names.
 * Key = DB normalized name, Value = tech-relations name (or vice versa).
 */
const TECH_NAME_ALIASES: Record<string, string> = {
  "express": "express.js",
  "express.js": "express",
  "vue": "vue.js",
  "vue.js": "vue",
  "nestjs": "nest.js",
  "nest.js": "nestjs",
  "spring-boot": "spring boot",
  "spring boot": "spring-boot",
  "springboot": "spring boot",
  "tailwind": "tailwind css",
  "tailwind css": "tailwind",
  "tailwindcss": "tailwind css",
};

/**
 * Convert KB ConceptHint[] rows into TechConceptSummary for LLM prompt.
 */
export function toTechSummary(
  techName: string,
  concepts: ConceptHint[],
): TechConceptSummary {
  return {
    tech: techName,
    concepts: concepts.map(c => ({
      concept_key: c.concept_key,
      concept_name: c.concept_name,
      category: c.category ?? "fundamentals",
      difficulty_tier: c.difficulty_tier ?? "beginner",
      tags: c.tags,
      key_points: c.key_points.slice(0, 3), // Trim for token savings
    })),
  };
}

// ── Prompt Construction ────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a technical education expert who identifies meaningful learning connections between programming technologies.

Your task: Given two technologies and their concept lists, find concept pairs where understanding one genuinely helps learn the other.

Rules:
1. Only link concepts with REAL pedagogical transfer — "learning X directly helps understand Y"
2. Assign the correct relation type based on HOW the concepts relate
3. Return 3-8 links per tech pair (quality over quantity)
4. Each link must have a brief reason explaining the learning transfer
5. Return ONLY valid JSON — no markdown fences, no commentary`;

function buildPrompt(
  source: TechConceptSummary,
  target: TechConceptSummary,
  techRelation: TechRelation | undefined,
): string {
  const relationContext = techRelation
    ? `\nTechnology relationship: ${source.tech} → ${target.tech} is "${techRelation.relation}" (strength: ${techRelation.strength})`
    : `\nNo predefined relationship between these technologies.`;

  const relationGuide = `
Relation types and when to use them:
- "foundation": Source concept is prerequisite knowledge for target (e.g., TypeScript generics → Angular dependency injection)
- "similar": Both concepts solve the same problem in their respective ecosystems (e.g., React useState ↔ Vue ref)
- "extends": Target concept builds directly on source concept (e.g., React components → Next.js pages)
- "alternative": Different approaches to the same goal, worth comparing (e.g., Django ORM ↔ Supabase queries)`;

  return `${relationContext}
${relationGuide}

## ${source.tech} Concepts
${JSON.stringify(source.concepts, null, 2)}

## ${target.tech} Concepts
${JSON.stringify(target.concepts, null, 2)}

Generate cross-tech links as a JSON array:
[
  {
    "source_concept_key": "concept-key-from-either-tech",
    "target_concept_key": "concept-key-from-either-tech",
    "source_tech": "tech-name",
    "target_tech": "tech-name",
    "relation": "foundation" | "similar" | "extends" | "alternative",
    "reason": "Brief explanation of learning transfer"
  }
]`;
}

// ── Response Parsing ──────────────────────────────────────────────────

function parseResponse(
  content: string,
  sourceTech: TechConceptSummary,
  targetTech: TechConceptSummary,
): CrossTechCandidate[] {
  try {
    // Extract JSON array from response (handle potential markdown wrapping)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      source_concept_key: string;
      target_concept_key: string;
      source_tech: string;
      target_tech: string;
      relation: string;
      reason: string;
    }>;

    if (!Array.isArray(parsed)) return [];

    const validRelations = new Set(["foundation", "similar", "extends", "alternative"]);
    const validTechs = new Set([
      sourceTech.tech.toLowerCase(),
      targetTech.tech.toLowerCase(),
    ]);

    return parsed
      .filter(item =>
        item.source_concept_key &&
        item.target_concept_key &&
        item.source_concept_key !== item.target_concept_key &&
        validRelations.has(item.relation) &&
        validTechs.has((item.source_tech || "").toLowerCase()) &&
        validTechs.has((item.target_tech || "").toLowerCase())
      )
      .map(item => ({
        sourceTech: item.source_tech,
        sourceConceptKey: item.source_concept_key,
        targetTech: item.target_tech,
        targetConceptKey: item.target_concept_key,
        relation: item.relation as CrossTechLink["relation"],
        reason: item.reason || "",
      }));
  } catch (err) {
    console.error("[cross-tech-inference] Failed to parse LLM response:", err);
    return [];
  }
}

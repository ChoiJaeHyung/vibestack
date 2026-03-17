"use server";

import { createClient } from "@supabase/supabase-js";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import type { ConceptHint, CrossTechLink } from "@/lib/knowledge/types";
import {
  batchGenerateCrossTechLinks,
  toTechSummary,
  type CrossTechCandidate,
} from "@/lib/knowledge/cross-tech-inference";

function createKBServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, serviceKey);
}

/**
 * Generate cross-tech links via LLM and merge into KB concepts in DB.
 * Admin-only action. Idempotent — merges without duplicating existing links.
 *
 * Returns count of newly added links.
 */
export async function generateAndPersistCrossTechLinks(
  locale: "ko" | "en" = "ko",
): Promise<{ success: boolean; added: number; error?: string }> {
  // Auth check — admin only
  const supabase = await createAuthClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, added: 0, error: "Not authenticated" };
  }

  // Check admin role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return { success: false, added: 0, error: "Admin access required" };
  }

  // Get LLM provider
  const llmResult = await getDefaultLlmKeyWithDiagnosis(user.id);
  if (!llmResult.data) {
    return { success: false, added: 0, error: "No LLM key configured" };
  }

  const provider = createLLMProvider(llmResult.data.provider, llmResult.data.apiKey);

  // Fetch all KB entries for the locale
  const kbClient = createKBServiceClient();
  const { data: kbRows, error: kbError } = await kbClient
    .from("technology_knowledge")
    .select("id, technology_name, technology_name_normalized, concepts")
    .eq("locale", locale)
    .eq("generation_status", "ready");

  if (kbError || !kbRows || kbRows.length === 0) {
    return { success: false, added: 0, error: "No KB data found" };
  }

  // Build tech summaries for LLM
  const techSummaries = kbRows.map(row =>
    toTechSummary(
      row.technology_name_normalized as string,
      row.concepts as ConceptHint[],
    ),
  );

  // Generate cross-tech links via LLM
  const candidates = await batchGenerateCrossTechLinks(techSummaries, provider);

  if (candidates.length === 0) {
    return { success: true, added: 0 };
  }

  // Merge candidates into KB concepts
  const added = await mergeCandidatesIntoDB(kbClient, kbRows, candidates);

  return { success: true, added };
}

/**
 * Merge LLM-generated cross-tech candidates into existing KB concept data.
 * Only adds links that don't already exist (by target concept_key).
 */
async function mergeCandidatesIntoDB(
  kbClient: ReturnType<typeof createKBServiceClient>,
  kbRows: Array<{
    id: string;
    technology_name: string;
    technology_name_normalized: string;
    concepts: unknown;
  }>,
  candidates: CrossTechCandidate[],
): Promise<number> {
  // Index candidates by source concept_key
  // Each candidate creates a link ON the source concept pointing TO the target
  const linksBySourceConcept = new Map<string, CrossTechLink[]>();
  const linksByTargetConcept = new Map<string, CrossTechLink[]>();

  for (const c of candidates) {
    // Forward link: source concept → target concept
    const fwdLinks = linksBySourceConcept.get(c.sourceConceptKey) ?? [];
    fwdLinks.push({
      tech: c.targetTech.toLowerCase(),
      concept_key: c.targetConceptKey,
      relation: c.relation,
    });
    linksBySourceConcept.set(c.sourceConceptKey, fwdLinks);

    // Reverse link for bidirectional navigation (similar/alternative)
    if (c.relation === "similar" || c.relation === "alternative") {
      const revLinks = linksByTargetConcept.get(c.targetConceptKey) ?? [];
      revLinks.push({
        tech: c.sourceTech.toLowerCase(),
        concept_key: c.sourceConceptKey,
        relation: c.relation,
      });
      linksByTargetConcept.set(c.targetConceptKey, revLinks);
    }
  }

  let totalAdded = 0;

  for (const row of kbRows) {
    const concepts = row.concepts as ConceptHint[];
    let modified = false;

    for (const concept of concepts) {
      const newFwd = linksBySourceConcept.get(concept.concept_key) ?? [];
      const newRev = linksByTargetConcept.get(concept.concept_key) ?? [];
      const newLinks = [...newFwd, ...newRev];

      if (newLinks.length === 0) continue;

      // Existing links
      const existing = concept.cross_tech_links ?? [];
      const existingKeys = new Set(
        existing.map(l => `${l.tech}:${l.concept_key}`),
      );

      // Add only non-duplicate links
      const toAdd = newLinks.filter(
        l => !existingKeys.has(`${l.tech}:${l.concept_key}`),
      );

      if (toAdd.length > 0) {
        concept.cross_tech_links = [...existing, ...toAdd];
        totalAdded += toAdd.length;
        modified = true;
      }
    }

    if (modified) {
      // Re-fetch to avoid overwriting concurrent changes (optimistic lock)
      const { data: freshRow } = await kbClient
        .from("technology_knowledge")
        .select("concepts")
        .eq("id", row.id)
        .single();

      if (freshRow) {
        // Re-apply our additions to the fresh data
        const freshConcepts = freshRow.concepts as ConceptHint[];
        for (const concept of freshConcepts) {
          const newFwd = linksBySourceConcept.get(concept.concept_key) ?? [];
          const newRev = linksByTargetConcept.get(concept.concept_key) ?? [];
          const newLinks = [...newFwd, ...newRev];
          if (newLinks.length === 0) continue;

          const existing = concept.cross_tech_links ?? [];
          const existingKeys = new Set(existing.map(l => `${l.tech}:${l.concept_key}`));
          const toAdd = newLinks.filter(l => !existingKeys.has(`${l.tech}:${l.concept_key}`));
          if (toAdd.length > 0) {
            concept.cross_tech_links = [...existing, ...toAdd];
          }
        }

        await kbClient
          .from("technology_knowledge")
          .update({
            concepts: freshConcepts,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
    }
  }

  return totalAdded;
}

/**
 * Get current cross-tech link statistics for admin dashboard.
 */
export async function getCrossTechStats(
  locale: "ko" | "en" = "ko",
): Promise<{
  totalLinks: number;
  byRelation: Record<string, number>;
  byTechPair: Array<{ pair: string; count: number }>;
}> {
  const kbClient = createKBServiceClient();
  const { data: kbRows } = await kbClient
    .from("technology_knowledge")
    .select("technology_name_normalized, concepts")
    .eq("locale", locale)
    .eq("generation_status", "ready");

  if (!kbRows) {
    return { totalLinks: 0, byRelation: {}, byTechPair: [] };
  }

  let totalLinks = 0;
  const byRelation: Record<string, number> = {};
  const pairCounts = new Map<string, number>();

  for (const row of kbRows) {
    const tech = row.technology_name_normalized as string;
    const concepts = row.concepts as ConceptHint[];

    for (const concept of concepts) {
      if (!concept.cross_tech_links) continue;
      for (const link of concept.cross_tech_links) {
        totalLinks++;
        byRelation[link.relation] = (byRelation[link.relation] ?? 0) + 1;

        const pair = [tech, link.tech].sort().join(" ↔ ");
        pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
      }
    }
  }

  const byTechPair = [...pairCounts.entries()]
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count);

  return { totalLinks, byRelation, byTechPair };
}

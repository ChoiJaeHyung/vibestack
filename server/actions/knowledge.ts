"use server";

import { createClient } from "@supabase/supabase-js";
import type { LLMProvider } from "@/lib/llm/types";
import type {
  ConceptHint,
  KBGenerationInput,
} from "@/lib/knowledge/types";
import { buildKBGenerationPrompt } from "@/lib/prompts/knowledge-generation";

/**
 * Service client without Database generic — technology_knowledge table
 * is not yet in the generated Database types.
 */
function createKBServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, serviceKey);
}

// ─── Helpers ────────────────────────────────────────────────────────

function normalizeTechName(name: string): string {
  return name.toLowerCase().trim();
}

// ─── DB Lookup ──────────────────────────────────────────────────────

export async function getKBFromDB(
  techName: string,
): Promise<{ concepts: ConceptHint[]; source: string } | null> {
  const supabase = createKBServiceClient();

  const { data, error } = await supabase
    .from("technology_knowledge")
    .select("concepts, source")
    .eq("technology_name_normalized", normalizeTechName(techName))
    .eq("generation_status", "ready")
    .maybeSingle();

  if (error || !data) return null;

  return {
    concepts: data.concepts as ConceptHint[],
    source: data.source as string,
  };
}

// ─── LLM Response Parser ────────────────────────────────────────────

function parseConceptsFromLLM(raw: string): ConceptHint[] {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const parsed: unknown = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array of concepts");
  }

  return parsed.map((item: Record<string, unknown>, idx: number) => {
    if (
      typeof item.concept_key !== "string" ||
      typeof item.concept_name !== "string" ||
      !Array.isArray(item.key_points) ||
      !Array.isArray(item.common_quiz_topics) ||
      !Array.isArray(item.tags)
    ) {
      throw new Error(`Invalid concept at index ${idx}: missing required fields`);
    }

    return {
      concept_key: item.concept_key,
      concept_name: item.concept_name,
      key_points: item.key_points as string[],
      common_quiz_topics: item.common_quiz_topics as string[],
      prerequisite_concepts: Array.isArray(item.prerequisite_concepts)
        ? (item.prerequisite_concepts as string[])
        : [],
      tags: item.tags as string[],
    };
  });
}

// ─── Single Technology KB Generation ────────────────────────────────

const STALE_LOCK_MS = 10 * 60 * 1000; // 10 minutes

export async function generateKBForTech(
  techName: string,
  version: string | null,
  provider: LLMProvider,
): Promise<ConceptHint[]> {
  const supabase = createKBServiceClient();
  const normalized = normalizeTechName(techName);
  const now = new Date().toISOString();

  // 1. Check for existing entry
  const { data: existing } = await supabase
    .from("technology_knowledge")
    .select("concepts, generation_status, updated_at")
    .eq("technology_name_normalized", normalized)
    .maybeSingle();

  if (existing?.generation_status === "ready") {
    return existing.concepts as ConceptHint[];
  }

  // 2. Handle existing row that needs re-generation (failed or stale lock)
  if (existing) {
    if (existing.generation_status === "generating") {
      const updatedAt = new Date(existing.updated_at).getTime();
      if (Date.now() - updatedAt < STALE_LOCK_MS) {
        // Generation in progress by another process — don't interfere
        return [];
      }
      // Stale lock — fall through to reclaim
    }
    // failed or stale generating → reclaim via optimistic lock (CAS pattern)
    // Use updated_at as version — only succeeds if no one else changed the row
    const { data: claimed } = await supabase
      .from("technology_knowledge")
      .update({
        generation_status: "generating",
        generation_error: null,
        updated_at: now,
      })
      .eq("technology_name_normalized", normalized)
      .eq("updated_at", existing.updated_at)
      .in("generation_status", ["failed", "generating"])
      .select("id")
      .maybeSingle();

    if (!claimed) {
      // Another process already reclaimed — let them handle it
      return [];
    }
  } else {
    // 3. No existing row — insert to claim generation lock
    const { error: insertError } = await supabase
      .from("technology_knowledge")
      .insert({
        technology_name: techName,
        technology_name_normalized: normalized,
        version,
        concepts: [],
        source: "llm_generated",
        generation_status: "generating",
      });

    // Unique violation (23505) means another process beat us
    if (insertError) {
      if (insertError.code === "23505") return [];
      console.error("[knowledge] Insert error:", insertError.message);
      return [];
    }
  }

  try {
    // 4. Generate concepts via LLM
    const prompt = buildKBGenerationPrompt(techName, version);
    const response = await provider.chat({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 8192,
    });

    // 5. Parse and validate response
    const concepts = parseConceptsFromLLM(response.content);

    if (concepts.length === 0) {
      throw new Error("LLM returned empty concepts array");
    }

    console.log(
      `[knowledge] Generated ${concepts.length} concepts for ${techName} (${provider.providerName}/${provider.modelName})`,
    );

    // 6. Update row with results
    await supabase
      .from("technology_knowledge")
      .update({
        concepts,
        generation_status: "ready",
        generated_at: now,
        llm_provider: provider.providerName,
        llm_model: provider.modelName,
        generation_error: null,
        updated_at: now,
      })
      .eq("technology_name_normalized", normalized);

    return concepts;
  } catch (err) {
    // 7. Mark as failed on any error
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[knowledge] Generation failed for ${techName}:`, message);

    await supabase
      .from("technology_knowledge")
      .update({
        generation_status: "failed",
        generation_error: message,
        updated_at: now,
      })
      .eq("technology_name_normalized", normalized);

    return [];
  }
}

// ─── Batch KB Generation ────────────────────────────────────────────

export async function generateMissingKBs(
  techs: KBGenerationInput[],
  provider: LLMProvider,
): Promise<void> {
  const supabase = createKBServiceClient();

  // Query existing KB entries that are ready (skip failed — let them retry)
  const normalizedNames = techs.map((t) => normalizeTechName(t.name));
  const { data: existingRows } = await supabase
    .from("technology_knowledge")
    .select("technology_name_normalized, generation_status")
    .in("technology_name_normalized", normalizedNames);

  const readyOrGeneratingSet = new Set(
    (existingRows ?? [])
      .filter((r) => r.generation_status === "ready" || r.generation_status === "generating")
      .map((r) => r.technology_name_normalized as string),
  );

  // Filter to techs that need generation (missing or failed)
  const missing = techs.filter(
    (t) => !readyOrGeneratingSet.has(normalizeTechName(t.name)),
  );

  // Generate sequentially to avoid overwhelming the LLM provider
  for (const tech of missing) {
    console.log(`[knowledge] Generating KB for ${tech.name}...`);
    try {
      await generateKBForTech(tech.name, tech.version, provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[knowledge] Error generating KB for ${tech.name}:`, message);
    }
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserRole } from "@/lib/utils/user-role";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { createLLMProvider } from "@/lib/llm/factory";
import { buildKBGenerationPrompt } from "@/lib/prompts/knowledge-generation";
import type { ConceptHint } from "@/lib/knowledge/types";
import type { Locale } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────

export interface KBListItem {
  id: string;
  technologyName: string;
  technologyNameNormalized: string;
  locale: string;
  generationStatus: string;
  source: string;
  generatedAt: string | null;
  llmProvider: string | null;
  llmModel: string | null;
  conceptCount: number;
  codeSignatureCount: number;
  codeSignatureTotal: number;
}

export interface RegenerationResult {
  kept: number;
  added: number;
  removed: number;
  affectedMasteryCount: number;
}

export interface RegenerationImpact {
  conceptCount: number;
  codeSignatureCount: number;
  linkedMasteryRecords: number;
  linkedProjects: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Untyped service client for technology_knowledge table
 * (not in the Database type definition).
 */
function createKBServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createSupabaseClient(url, serviceKey);
}

async function requireAdmin(): Promise<string> {
  const roleInfo = await getCurrentUserRole();
  if (!roleInfo || (roleInfo.role !== "admin" && roleInfo.role !== "super_admin")) {
    throw new Error("Admin access required");
  }
  // Get user ID for LLM key lookup
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

function parseConceptsFromLLM(raw: string): ConceptHint[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
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
      throw new Error(
        `Invalid concept at index ${idx}: missing required fields`,
      );
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
      ...(item.difficulty_tier
        ? { difficulty_tier: item.difficulty_tier as string }
        : {}),
      ...(item.category ? { category: item.category as string } : {}),
      ...(item.cross_tech_links
        ? { cross_tech_links: item.cross_tech_links as ConceptHint["cross_tech_links"] }
        : {}),
      ...(item.code_signature
        ? { code_signature: item.code_signature as ConceptHint["code_signature"] }
        : {}),
    } as ConceptHint;
  });
}

// ─── 1. getKBList ─────────────────────────────────────────────────────

export async function getKBList(): Promise<{
  success: boolean;
  data: KBListItem[];
  error?: string;
}> {
  try {
    await requireAdmin();

    const supabase = createKBServiceClient();

    const { data, error } = await supabase
      .from("technology_knowledge")
      .select(
        "id, technology_name, technology_name_normalized, locale, generation_status, source, generated_at, llm_provider, llm_model, concepts",
      )
      .order("technology_name_normalized", { ascending: true })
      .order("locale", { ascending: true });

    if (error) {
      return { success: false, data: [], error: error.message };
    }

    const items = (data ?? []).map(
      (row: Record<string, unknown>): KBListItem => {
        const concepts = (row.concepts ?? []) as ConceptHint[];
        const codeSignatureCount = concepts.filter(
          (c) => c.code_signature != null,
        ).length;

        return {
          id: row.id as string,
          technologyName: row.technology_name as string,
          technologyNameNormalized: row.technology_name_normalized as string,
          locale: row.locale as string,
          generationStatus: row.generation_status as string,
          source: (row.source ?? "") as string,
          generatedAt: (row.generated_at as string) ?? null,
          llmProvider: (row.llm_provider as string) ?? null,
          llmModel: (row.llm_model as string) ?? null,
          conceptCount: concepts.length,
          codeSignatureCount,
          codeSignatureTotal: concepts.length,
        };
      },
    );

    return { success: true, data: items };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, data: [], error: message };
  }
}

// ─── 2. regenerateKB ──────────────────────────────────────────────────

export async function regenerateKB(
  knowledgeId: string,
): Promise<{
  success: boolean;
  data?: RegenerationResult;
  error?: string;
}> {
  const adminUserId = await requireAdmin();

  const supabase = createKBServiceClient();

  // 1. Read existing KB row by id
  const { data: existing, error: fetchError } = await supabase
    .from("technology_knowledge")
    .select(
      "id, technology_name, technology_name_normalized, locale, version, concepts, generation_status",
    )
    .eq("id", knowledgeId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: `DB fetch failed: ${fetchError.message}` };
  }
  if (!existing) {
    return { success: false, error: `KB not found: ${knowledgeId}` };
  }

  const existingConcepts = (existing.concepts ?? []) as ConceptHint[];
  const existingKeys = existingConcepts.map((c) => c.concept_key);
  const techNameNormalized = existing.technology_name_normalized as string;
  const locale = existing.locale as string;
  const techName = existing.technology_name as string;
  const version = (existing.version as string) ?? null;

  // 2. Concurrency guard — reject if already generating
  if (existing.generation_status === "generating") {
    return { success: false, error: "Regeneration already in progress" };
  }

  // Set optimistic lock — update only if not already generating
  const lockNow = new Date().toISOString();
  const { data: lockResult } = await supabase
    .from("technology_knowledge")
    .update({ generation_status: "generating", updated_at: lockNow })
    .eq("id", knowledgeId)
    .neq("generation_status", "generating")
    .select("id");

  if (!lockResult || lockResult.length === 0) {
    return { success: false, error: "Regeneration already in progress" };
  }

  // 3. Get admin's LLM key
  const llmKeyResult = await getDefaultLlmKeyWithDiagnosis(adminUserId);
  if (!llmKeyResult.data) {
    return {
      success: false,
      error: `LLM key not available: ${llmKeyResult.error ?? "unknown"}`,
    };
  }

  const provider = createLLMProvider(
    llmKeyResult.data.provider,
    llmKeyResult.data.apiKey,
  );

  // 3. Build prompt — inject existing concept_keys to encourage preservation
  const basePrompt = buildKBGenerationPrompt(
    techName,
    version,
    locale as Locale,
  );

  const existingKeysHint =
    existingKeys.length > 0
      ? `\n\n## Existing Concept Keys (Preserve When Possible)\n\nThe following concept_keys already exist in the knowledge base. To minimize disruption to user mastery records, KEEP these keys when the concept is still relevant. You may add new concepts or remove truly obsolete ones, but prefer stability.\n\nExisting keys: ${existingKeys.join(", ")}`
      : "";

  const prompt = basePrompt + existingKeysHint;

  // 4. Call LLM
  let newConcepts: ConceptHint[];
  try {
    const response = await provider.chat({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 8192,
    });
    newConcepts = parseConceptsFromLLM(response.content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[admin-knowledge] LLM/parse failed for ${techNameNormalized}:`,
      message,
    );
    // Rollback lock — restore previous status
    await supabase
      .from("technology_knowledge")
      .update({ generation_status: existing.generation_status, updated_at: new Date().toISOString() })
      .eq("id", knowledgeId);
    return { success: false, error: `LLM generation failed: ${message}` };
  }

  if (newConcepts.length === 0) {
    // Rollback lock
    await supabase
      .from("technology_knowledge")
      .update({ generation_status: existing.generation_status, updated_at: new Date().toISOString() })
      .eq("id", knowledgeId);
    return { success: false, error: "LLM returned empty concepts array" };
  }

  // 5. Compute diff
  const newKeys = new Set(newConcepts.map((c) => c.concept_key));
  const oldKeys = new Set(existingKeys);

  const keptKeys = existingKeys.filter((k) => newKeys.has(k));
  const addedKeys = newConcepts
    .map((c) => c.concept_key)
    .filter((k) => !oldKeys.has(k));
  const removedKeys = existingKeys.filter((k) => !newKeys.has(k));

  // 6. Count affected mastery records for removed keys
  let affectedMasteryCount = 0;
  if (removedKeys.length > 0) {
    const { count } = await supabase
      .from("user_concept_mastery")
      .select("id", { count: "exact", head: true })
      .eq("knowledge_id", knowledgeId)
      .in("concept_key", removedKeys);

    affectedMasteryCount = count ?? 0;
  }

  // 7. UPDATE technology_knowledge — preserve id, update concepts
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("technology_knowledge")
    .update({
      concepts: newConcepts,
      generation_status: "ready",
      generated_at: now,
      source: "admin_regenerated",
      llm_provider: provider.providerName,
      llm_model: provider.modelName,
      generation_error: null,
      updated_at: now,
    })
    .eq("id", knowledgeId);

  if (updateError) {
    console.error(
      `[admin-knowledge] DB update failed for ${techNameNormalized}:`,
      updateError.message,
    );
    return { success: false, error: `DB update failed: ${updateError.message}` };
  }

  // 8. Invalidate project_concept_matches for lazy recompute
  const { error: deleteError } = await supabase
    .from("project_concept_matches")
    .delete()
    .eq("technology_name", techNameNormalized);

  if (deleteError) {
    console.error(
      `[admin-knowledge] Failed to clear concept matches for ${techNameNormalized}:`,
      deleteError.message,
    );
    // Non-fatal — matches will be stale but will recompute on next access
  }

  console.log(
    `[admin-knowledge] Regenerated KB for ${techNameNormalized}|${locale}: ` +
      `kept=${keptKeys.length}, added=${addedKeys.length}, removed=${removedKeys.length}, ` +
      `affectedMastery=${affectedMasteryCount}`,
  );

  return {
    success: true,
    data: {
      kept: keptKeys.length,
      added: addedKeys.length,
      removed: removedKeys.length,
      affectedMasteryCount,
    },
  };
}

// ─── 3. getRegenerationImpact ─────────────────────────────────────────

export async function getRegenerationImpact(
  knowledgeId: string,
): Promise<{
  success: boolean;
  data?: RegenerationImpact;
  error?: string;
}> {
  try {
    await requireAdmin();

    const supabase = createKBServiceClient();

    // Get KB row by id
    const { data: kb, error: kbError } = await supabase
      .from("technology_knowledge")
      .select("id, technology_name_normalized, concepts")
      .eq("id", knowledgeId)
      .maybeSingle();

    if (kbError || !kb) {
      return {
        success: false,
        error: kbError?.message ?? `KB not found: ${knowledgeId}`,
      };
    }

    const concepts = (kb.concepts ?? []) as ConceptHint[];
    const conceptCount = concepts.length;
    const codeSignatureCount = concepts.filter(
      (c) => c.code_signature != null,
    ).length;
    const techNameNormalized = kb.technology_name_normalized as string;

    // Count linked mastery records
    const { count: masteryCount } = await supabase
      .from("user_concept_mastery")
      .select("id", { count: "exact", head: true })
      .eq("knowledge_id", knowledgeId);

    // Count linked projects (distinct project_id from concept matches)
    const { data: matchRows } = await supabase
      .from("project_concept_matches")
      .select("project_id")
      .eq("technology_name", techNameNormalized);

    const uniqueProjectIds = new Set(
      (matchRows ?? []).map(
        (r: Record<string, unknown>) => r.project_id as string,
      ),
    );

    return {
      success: true,
      data: {
        conceptCount,
        codeSignatureCount,
        linkedMasteryRecords: masteryCount ?? 0,
        linkedProjects: uniqueProjectIds.size,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptContent } from "@/lib/utils/content-encryption";
import { matchConceptsToFiles } from "@/lib/knowledge/code-matcher";
import { getKBHints } from "@/lib/knowledge";
import type { MatchableFile, ConceptMatchInput } from "@/lib/knowledge/code-matcher";
import type { ConceptHint } from "@/lib/knowledge/types";

/**
 * Untyped client for technology_knowledge + project_concept_matches queries.
 */
function createKBClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createSupabaseClient(url, serviceKey);
}

// ── Types ────────────────────────────────────────────────────────────

interface DecryptedFile {
  file_name: string;
  file_path: string | null;
  file_type: string;
  raw_content: string | null;
}

// ── Main: Compute and Store ──────────────────────────────────────────

/**
 * Compute concept matches for a project and store results in DB.
 *
 * Called from two places:
 * 1. After analysis pipeline (projects.ts) — decryptedFiles already available
 * 2. Lazy compute from knowledge-graph.ts — files fetched + decrypted here
 *
 * @param projectId - Project UUID
 * @param preloadedFiles - Already decrypted files (from analysis pipeline). If null, fetches from DB.
 */
export async function computeAndStoreConceptMatches(
  projectId: string,
  preloadedFiles?: DecryptedFile[] | null,
): Promise<number> {
  const serviceClient = createServiceClient();
  const kbClient = createKBClient();

  // 1. Get project's tech_stacks
  const { data: techStacks } = await serviceClient
    .from("tech_stacks")
    .select("technology_name")
    .eq("project_id", projectId);

  if (!techStacks || techStacks.length === 0) return 0;

  // 2. Get KB concepts with code_signatures for each tech
  const normalizedNames = techStacks.map(ts =>
    ts.technology_name.toLowerCase().trim(),
  );

  // Fetch user locale (default ko)
  const { data: project } = await serviceClient
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();

  let locale = "ko";
  if (project?.user_id) {
    const { data: userData } = await serviceClient
      .from("users")
      .select("locale")
      .eq("id", project.user_id)
      .single();
    locale = userData?.locale ?? "ko";
  }

  // Ensure KB exists for all techs (lazy seed sync)
  await Promise.all(
    techStacks.map(ts => getKBHints(ts.technology_name, locale as "ko" | "en")),
  );

  const { data: kbRows } = await kbClient
    .from("technology_knowledge")
    .select("technology_name, technology_name_normalized, concepts")
    .in("technology_name_normalized", normalizedNames)
    .eq("locale", locale)
    .eq("generation_status", "ready");

  if (!kbRows || kbRows.length === 0) return 0;

  // Build concept inputs (only concepts with code_signature)
  const conceptInputs: ConceptMatchInput[] = [];
  for (const row of kbRows) {
    const concepts = row.concepts as ConceptHint[];
    for (const c of concepts) {
      if (!c.code_signature) continue;
      conceptInputs.push({
        technology_name: row.technology_name_normalized as string,
        concept_key: c.concept_key,
        code_signature: c.code_signature,
      });
    }
  }

  if (conceptInputs.length === 0) return 0;

  // 3. Get project files
  let matchableFiles: MatchableFile[];

  if (preloadedFiles) {
    // Files already decrypted (from analysis pipeline)
    matchableFiles = preloadedFiles
      .filter(f => f.file_name !== "_project_digest.md")
      .map(f => ({
        file_path: f.file_path ?? f.file_name,
        file_type: f.file_type,
        content: f.raw_content,
      }));
  } else {
    // Lazy compute: fetch from DB with content budget
    matchableFiles = await fetchProjectFilesForMatching(projectId);
  }

  if (matchableFiles.length === 0) return 0;

  // 4. Run matching
  const matches = matchConceptsToFiles(matchableFiles, conceptInputs);

  if (matches.length === 0) {
    // Insert sentinel row so hasConceptMatches() returns true,
    // preventing repeated lazy compute on every graph load
    const now = new Date().toISOString();
    await kbClient
      .from("project_concept_matches")
      .upsert(
        {
          project_id: projectId,
          technology_name: "__none__",
          concept_key: "__sentinel__",
          match_score: 0,
          matched_files: [],
          marker_summary: {},
          computed_at: now,
        },
        { onConflict: "project_id,technology_name,concept_key" },
      );
    return 0;
  }

  // 5. Store results — upsert leveraging UNIQUE(project_id, technology_name, concept_key)
  const now = new Date().toISOString();
  const rows = matches.map(m => ({
    project_id: projectId,
    technology_name: m.technology_name,
    concept_key: m.concept_key,
    match_score: m.match_score,
    matched_files: m.matched_files,
    marker_summary: m.marker_summary,
    computed_at: now,
  }));

  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const { error: upsertError } = await kbClient
      .from("project_concept_matches")
      .upsert(rows.slice(i, i + BATCH_SIZE), {
        onConflict: "project_id,technology_name,concept_key",
      });
    if (upsertError) {
      console.error("[concept-matches] Upsert failed:", upsertError.message);
    }
  }

  // Clean up stale matches (concepts no longer matched)
  const matchedKeys = new Set(matches.map(m => m.concept_key));
  const { data: existingRows } = await kbClient
    .from("project_concept_matches")
    .select("id, concept_key")
    .eq("project_id", projectId);

  if (existingRows) {
    const staleIds = existingRows
      .filter(r => !matchedKeys.has(r.concept_key))
      .map(r => r.id);
    if (staleIds.length > 0) {
      await kbClient
        .from("project_concept_matches")
        .delete()
        .in("id", staleIds);
    }
  }

  return matches.length;
}

// ── Fetch Files with Content Budget ──────────────────────────────────

const CONTENT_BUDGET = 100_000; // 100K chars total for lazy compute

async function fetchProjectFilesForMatching(
  projectId: string,
): Promise<MatchableFile[]> {
  const serviceClient = createServiceClient();

  // Fetch file metadata + content (prioritize config & source_code)
  const { data: files } = await serviceClient
    .from("project_files")
    .select("file_name, file_path, file_type, raw_content")
    .eq("project_id", projectId)
    .in("file_type", ["source_code", "build_config", "dependency", "ai_config"])
    .order("file_type")
    .limit(200);

  if (!files || files.length === 0) return [];

  const result: MatchableFile[] = [];
  let totalChars = 0;

  for (const f of files) {
    if (f.file_name === "_project_digest.md") continue;

    const filePath = f.file_path ?? f.file_name;
    let content: string | null = null;

    if (f.raw_content && totalChars < CONTENT_BUDGET) {
      try {
        content = decryptContent(f.raw_content);
        totalChars += content.length;
      } catch {
        // Skip undecryptable files — path-only matching still works
      }
    }

    result.push({
      file_path: filePath,
      file_type: f.file_type,
      content,
    });
  }

  return result;
}

// ── Check if Matches Exist ───────────────────────────────────────────

/**
 * Check if concept matches have been computed for a project.
 * Used by knowledge-graph.ts for lazy compute.
 */
export async function hasConceptMatches(projectId: string): Promise<boolean> {
  const kbClient = createKBClient();
  const { count } = await kbClient
    .from("project_concept_matches")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  return (count ?? 0) > 0;
}

/**
 * Get concept match scores for a project.
 * Returns a Map of concept_key → match_score.
 */
export async function getConceptMatchScores(
  projectId: string,
): Promise<Map<string, { score: number; files: string[] }>> {
  const kbClient = createKBClient();
  const { data } = await kbClient
    .from("project_concept_matches")
    .select("concept_key, match_score, matched_files")
    .eq("project_id", projectId);

  const map = new Map<string, { score: number; files: string[] }>();
  if (data) {
    for (const row of data) {
      if (row.concept_key === "__sentinel__") continue;
      map.set(row.concept_key, {
        score: row.match_score,
        files: row.matched_files ?? [],
      });
    }
  }
  return map;
}

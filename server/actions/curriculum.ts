"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { llmKeyErrorMessage } from "@/lib/utils/llm-key-errors";
import { checkUsageLimit, checkRegenerationLimit } from "@/lib/utils/usage-limits";
import {
  buildStructurePrompt,
  buildContentBatchPrompt,
} from "@/lib/prompts/learning-roadmap";
import {
  buildProjectDigest,
  getEducationalAnalysis,
} from "@/lib/learning/project-digest";
import { decryptContent } from "@/lib/utils/content-encryption";
import { getKBHints } from "@/lib/knowledge";
import { generateKBForTech, generateMissingKBs } from "@/server/actions/knowledge";
import { rateLimit } from "@/lib/utils/rate-limit";
import { after } from "next/server";
import { getUserLocale } from "@/server/actions/learning-utils";
import { resetModuleProgress } from "@/server/actions/learning-progress";
import { validateModule } from "@/lib/utils/curriculum-validation";
import { computeModulePrerequisites } from "@/lib/learning/prerequisite-compute";
import type { Database, Json, Locale } from "@/types/database";
import type { EducationalAnalysis } from "@/types/educational-analysis";

// ─── Regeneration Types ─────────────────────────────────────────────

export type RegenerationReason = "too_difficult" | "too_easy" | "need_more_code" | "not_relevant";

const REGENERATION_HINTS: Record<RegenerationReason, Record<Locale, string>> = {
  too_difficult: {
    ko: "⚠️ 이전 콘텐츠가 너무 어렵다는 피드백이 있었습니다. 더 쉬운 비유와 단계별 설명을 사용하고, 전문 용어를 최소화하세요. 모든 개념을 일상적인 예시로 먼저 설명하세요.",
    en: "⚠️ Previous content was too difficult. Use simpler analogies and step-by-step explanations. Minimize jargon. Start every concept with an everyday example.",
  },
  too_easy: {
    ko: "⚠️ 이전 콘텐츠가 너무 쉽다는 피드백이 있었습니다. 더 심층적인 원리, 내부 동작 메커니즘, 고급 사용 패턴을 포함하세요. 기초적인 비유는 줄이고 실제 구현 세부사항에 집중하세요.",
    en: "⚠️ Previous content was too easy. Include deeper principles, internal mechanisms, and advanced patterns. Reduce basic analogies and focus on implementation details.",
  },
  need_more_code: {
    ko: "⚠️ 코드 예제가 부족하다는 피드백이 있었습니다. code_example 섹션을 더 많이 포함하고, 각 설명에 구체적인 코드 스니펫을 첨부하세요. 실행 가능한 예제 위주로 작성하세요.",
    en: "⚠️ More code examples needed. Include more code_example sections, attach specific code snippets to each explanation, and focus on runnable examples.",
  },
  not_relevant: {
    ko: "⚠️ 실제 프로젝트와 관련이 없다는 피드백이 있었습니다. 학생의 실제 프로젝트 코드를 더 많이 인용하고, 일반적인 예시 대신 프로젝트 파일의 구체적인 코드를 설명하세요.",
    en: "⚠️ Content wasn't relevant to the project. Reference the student's actual project code more heavily. Use specific code from project files instead of generic examples.",
  },
};

// ─── Type Aliases ────────────────────────────────────────────────────

type Difficulty = Database["public"]["Enums"]["difficulty"];
type ModuleType = Database["public"]["Enums"]["module_type"];
type LearningPathInsert = Database["public"]["Tables"]["learning_paths"]["Insert"];
type LearningModuleInsert = Database["public"]["Tables"]["learning_modules"]["Insert"];
type AnalysisJobInsert = Database["public"]["Tables"]["analysis_jobs"]["Insert"];
type AnalysisJobUpdate = Database["public"]["Tables"]["analysis_jobs"]["Update"];

// ─── Response Types ──────────────────────────────────────────────────

interface GenerateLearningPathResult {
  success: boolean;
  data?: {
    learning_path_id: string;
    title: string;
    total_modules: number;
    first_module_id: string | null;
  };
  error?: string;
}

export interface ContentSection {
  type: string;
  title: string;
  body: string;
  code?: string;
  quiz_options?: string[];
  quiz_answer?: number;
  challenge_starter_code?: string;
  challenge_answer_code?: string;
  quiz_explanation?: string;
}

export interface ModuleContent {
  sections: ContentSection[];
}

interface GenerateModuleContentResult {
  success: boolean;
  data?: { sections: ContentSection[] };
  generating?: boolean;
  error?: string;
}

// ─── LLM Response Types ──────────────────────────────────────────────

// Phase 1 — structure only (no content)
interface StructureModuleResponse {
  title: string;
  description: string;
  module_type: string;
  estimated_minutes: number;
  tech_name: string;
  relevant_files: string[];
  learning_objectives: string[];
}

interface StructureResponse {
  title: string;
  description: string;
  difficulty: string;
  estimated_hours: number;
  modules: StructureModuleResponse[];
}

// Phase 2 — content batch per tech_name
interface ContentBatchItem {
  module_title: string;
  concept_keys?: string[];
  content: {
    sections: Array<{
      type: string;
      title: string;
      body: string;
      code?: string;
      quiz_options?: string[];
      quiz_answer?: number;
      challenge_starter_code?: string;
      challenge_answer_code?: string;
      quiz_explanation?: string;
    }>;
  };
}

// On-demand module content generation types
interface ModuleContentMeta {
  tech_name: string;
  relevant_files: string[];
  learning_objectives: string[];
  retry_count?: number;
}

interface ModuleContentWithMeta {
  sections: ContentSection[];
  _meta?: ModuleContentMeta;
  _status?: "generating" | "error" | "ready" | "validation_failed";
  _generating_since?: string;
  _generated_at?: string;
  _error?: string;
  _regeneration_count?: number;
  _regeneration_hint?: RegenerationReason;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const VALID_MODULE_TYPES = new Set<ModuleType>([
  "concept",
  "practical",
  "quiz",
  "project_walkthrough",
]);

const VALID_DIFFICULTIES = new Set<Difficulty>([
  "beginner",
  "intermediate",
  "advanced",
]);

function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  // Remove ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
  }
  return cleaned.trim();
}

/**
 * Extract a JSON array from LLM output.
 * Handles: bare array, or wrapper objects like { "modules": [...] }.
 */
function extractContentArray(raw: string): ContentBatchItem[] {
  const cleaned = stripCodeFences(raw);
  const parsed: unknown = JSON.parse(cleaned);

  if (Array.isArray(parsed)) {
    return parsed as ContentBatchItem[];
  }

  // If the LLM wrapped the array in an object, try common keys
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        return obj[key] as ContentBatchItem[];
      }
    }
  }

  throw new Error("Response is neither an array nor an object containing an array");
}

/** Normalize a title for fuzzy comparison. */
function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Load only the specific files needed for a module's content generation.
 * Much cheaper than buildProjectDigest which loads ALL files.
 */
async function loadRelevantFiles(
  projectId: string,
  filePaths: string[],
): Promise<Array<{ path: string; content: string }>> {
  if (filePaths.length === 0) return [];

  const serviceClient = createServiceClient();
  const { data: files } = await serviceClient
    .from("project_files")
    .select("file_path, file_name, raw_content")
    .eq("project_id", projectId)
    .in("file_path", filePaths);

  if (!files || files.length === 0) {
    // Fallback: try matching by file_name (some records may not have file_path)
    const { data: filesByName } = await serviceClient
      .from("project_files")
      .select("file_path, file_name, raw_content")
      .eq("project_id", projectId)
      .in("file_name", filePaths);

    if (!filesByName || filesByName.length === 0) return [];

    return filesByName
      .filter((f) => f.raw_content)
      .map((f) => ({
        path: f.file_path ?? f.file_name,
        content: decryptContent(f.raw_content!),
      }));
  }

  return files
    .filter((f) => f.raw_content)
    .map((f) => ({
      path: f.file_path ?? f.file_name,
      content: decryptContent(f.raw_content!),
    }));
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function generateLearningPath(
  projectId: string,
  difficulty?: Difficulty,
): Promise<GenerateLearningPathResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Rate limit: 5 learning path generations per minute per user
    const rl = rateLimit(`learning:${user.id}`, 5);
    if (!rl.success) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    // Check usage limit
    const usageCheck = await checkUsageLimit(user.id, "learning");
    if (!usageCheck.allowed) {
      return {
        success: false,
        error: usageCheck.upgrade_message ?? "Usage limit reached",
      };
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    // Load tech stacks for the project
    const { data: techStacks, error: techError } = await supabase
      .from("tech_stacks")
      .select(
        "id, technology_name, category, importance, version, description",
      )
      .eq("project_id", projectId)
      .order("confidence_score", { ascending: false });

    if (techError || !techStacks || techStacks.length === 0) {
      return {
        success: false,
        error: "No tech stacks found. Please analyze the project first.",
      };
    }

    // Run remaining pre-LLM queries in parallel
    const [llmKeyResult, digest, educationalAnalysis, locale] = await Promise.all([
      getDefaultLlmKeyWithDiagnosis(user.id),
      buildProjectDigest(projectId),
      getEducationalAnalysis(projectId),
      getUserLocale(user.id),
    ]);

    if (!llmKeyResult.data) {
      return {
        success: false,
        error: llmKeyErrorMessage(llmKeyResult.error),
      };
    }
    const llmKeyData = llmKeyResult.data;

    const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);

    // ─── Phase 1: Generate roadmap structure ──────────────────────────
    const structurePrompt = buildStructurePrompt(
      techStacks.map((t) => ({
        technology_name: t.technology_name,
        category: t.category,
        importance: t.importance,
        version: t.version,
        description: t.description,
      })),
      digest.raw,
      difficulty,
      educationalAnalysis ?? undefined,
      locale,
    );

    const structureResult = await provider.chat({
      messages: [{ role: "user", content: structurePrompt }],
      maxTokens: 32768,
    });

    const totalInputTokens = structureResult.input_tokens;
    const totalOutputTokens = structureResult.output_tokens;

    let structure: StructureResponse;
    try {
      structure = JSON.parse(
        stripCodeFences(structureResult.content),
      ) as StructureResponse;
    } catch (parseError) {
      console.error(
        "[learning] Phase 1 parse error:",
        parseError instanceof Error ? parseError.message : parseError,
      );
      console.error(
        "[learning] Raw LLM response (first 500 chars):",
        structureResult.content.slice(0, 500),
      );
      return {
        success: false,
        error: "Failed to parse learning roadmap structure from LLM response",
      };
    }

    // ─── Persist to database ──────────────────────────────────────────

    // Validate and normalize difficulty
    const roadmapDifficulty = VALID_DIFFICULTIES.has(
      structure.difficulty as Difficulty,
    )
      ? (structure.difficulty as Difficulty)
      : difficulty ?? "beginner";

    // Use service client for inserting records (bypass RLS)
    const serviceClient = createServiceClient();

    // Compute estimated_hours from module minutes (more accurate than LLM guess)
    const totalMinutes = structure.modules.reduce(
      (sum: number, m: { estimated_minutes?: number }) => sum + (m.estimated_minutes ?? 30),
      0,
    );
    const computedHours = Math.ceil(totalMinutes / 60);

    // Create learning_paths record
    const pathInsert: LearningPathInsert = {
      project_id: projectId,
      user_id: user.id,
      title: structure.title,
      description: structure.description ?? null,
      difficulty: roadmapDifficulty,
      estimated_hours: computedHours,
      total_modules: structure.modules.length,
      llm_provider: provider.providerName,
      status: "active",
      locale,
    };

    const { data: learningPath, error: pathError } = await serviceClient
      .from("learning_paths")
      .insert(pathInsert)
      .select("id")
      .single();

    if (pathError || !learningPath) {
      return { success: false, error: "Failed to create learning path" };
    }

    // Build a map of tech_name -> tech_stack_id for linking
    const techNameToId = new Map<string, string>();
    for (const tech of techStacks) {
      techNameToId.set(tech.technology_name.toLowerCase(), tech.id);
    }

    const moduleInserts: LearningModuleInsert[] = structure.modules.map(
      (mod, index) => {
        const moduleType = VALID_MODULE_TYPES.has(
          mod.module_type as ModuleType,
        )
          ? (mod.module_type as ModuleType)
          : "concept";

        const techStackId =
          techNameToId.get(mod.tech_name.toLowerCase()) ?? null;

        // Store _meta for on-demand content generation later
        const content = {
          sections: [],
          _meta: {
            tech_name: mod.tech_name,
            relevant_files: mod.relevant_files ?? [],
            learning_objectives: mod.learning_objectives ?? [],
          },
        };

        return {
          learning_path_id: learningPath.id,
          title: mod.title,
          description: mod.description ?? null,
          module_type: moduleType,
          module_order: index + 1,
          estimated_minutes: mod.estimated_minutes ?? null,
          tech_stack_id: techStackId,
          content: content as unknown as Json,
        };
      },
    );

    const { data: insertedModules, error: modulesError } = await serviceClient
      .from("learning_modules")
      .insert(moduleInserts)
      .select("id, module_order")
      .order("module_order", { ascending: true });

    if (modulesError) {
      return { success: false, error: "Failed to create learning modules" };
    }

    // Create analysis_jobs record for tracking (aggregate token usage)
    const jobInsert: AnalysisJobInsert = {
      project_id: projectId,
      user_id: user.id,
      job_type: "learning_generation",
      status: "completed",
      llm_provider: provider.providerName,
      llm_model: provider.modelName,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    await serviceClient.from("analysis_jobs").insert(jobInsert);

    const firstModuleId = insertedModules?.[0]?.id ?? null;

    // Pre-generate missing KBs before background content generation
    // This ensures KB hints are available when Phase 2 starts
    const techNamesForKB = [...new Set(
      structure.modules.map((m) => m.tech_name)
    )];

    // All users: background-generate ALL modules after response
    if (insertedModules && insertedModules.length > 0) {
      const allModuleIds = insertedModules.map((m) => m.id);
      after(async () => {
        try {
          // Step 1: Pre-generate missing KBs so Phase 2 has hints
          await generateMissingKBs(
            techNamesForKB.map((name) => ({ name, version: null })),
            provider,
            locale,
          );
        } catch (err) {
          console.error("[learning] KB pre-generation failed:", err instanceof Error ? err.message : err);
        }

        try {
          // Step 2: Generate all module content
          await _generateAllModuleContentInBackground(allModuleIds, user.id);
        } catch (err) {
          console.error("[learning] Background generation failed:", err instanceof Error ? err.message : err);
        }

        try {
          // Step 3: Compute module prerequisites from concept DAG (R4')
          await updatePrerequisitesForPath(learningPath.id);
        } catch (err) {
          console.error("[learning] Prerequisite computation failed:", err instanceof Error ? err.message : err);
        }
      });
    }

    return {
      success: true,
      data: {
        learning_path_id: learningPath.id,
        title: structure.title,
        total_modules: structure.modules.length,
        first_module_id: firstModuleId,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Validates LLM-generated sections using the shared validateModule utility.
 * This ensures web-generated content is validated with the same rules as MCP-submitted content.
 */
function _validateGeneratedSections(
  sections: Array<{ type?: string; body?: string; code?: string; quiz_options?: unknown[]; quiz_answer?: unknown }>,
  difficulty?: string,
): boolean {
  const mockModule = {
    title: "temp",
    description: "temp",
    module_type: "concept",
    tech_name: "temp",
    content: { sections },
  };
  const result = validateModule(mockModule, 0, difficulty ?? "beginner");
  return result.valid;
}

export async function generateModuleContent(
  moduleId: string,
): Promise<GenerateModuleContentResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch the module
    const { data: moduleData, error: moduleError } = await supabase
      .from("learning_modules")
      .select(
        "id, title, description, module_type, content, learning_path_id",
      )
      .eq("id", moduleId)
      .single();

    if (moduleError || !moduleData) {
      return { success: false, error: "Module not found" };
    }

    // Verify user owns the learning path
    const { data: pathData, error: pathError } = await supabase
      .from("learning_paths")
      .select("id, project_id, difficulty")
      .eq("id", moduleData.learning_path_id)
      .eq("user_id", user.id)
      .single();

    if (pathError || !pathData) {
      return { success: false, error: "Learning path not found" };
    }

    const content = moduleData.content as unknown as ModuleContentWithMeta;

    // If content already exists, return immediately
    if (content.sections && content.sections.length > 0) {
      return { success: true, data: { sections: content.sections } };
    }

    // If currently generating and not stale (< 120s), tell client to wait
    if (content._status === "generating" && content._generating_since) {
      const sinceTime = new Date(content._generating_since).getTime();
      if (!Number.isNaN(sinceTime) && Date.now() - sinceTime < 120_000) {
        return { success: true, generating: true };
      }
      // Otherwise stale or invalid timestamp — re-generate
    }

    // Check _meta exists
    if (!content._meta) {
      return {
        success: false,
        error:
          "module_metadata_missing",
      };
    }

    // Delegate to shared internal generator
    // Delegate to shared internal generator
    const result = await _generateContentForModule(moduleId, user.id);
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    // Try to set error status while preserving _meta
    try {
      const serviceClient = createServiceClient();
      const { data: currentModule } = await serviceClient
        .from("learning_modules")
        .select("content")
        .eq("id", moduleId)
        .single();

      const currentContent = currentModule?.content as unknown as ModuleContentWithMeta | null;

      await serviceClient
        .from("learning_modules")
        .update({
          content: {
            sections: [],
            _meta: currentContent?._meta,
            _status: "error",
            _error: message,
          } as unknown as Json,
        })
        .eq("id", moduleId);
    } catch {
      // Ignore cleanup errors
    }

    return { success: false, error: message };
  }
}

/**
 * Regenerate module content with an optional feedback reason.
 * Resets content, progress, and triggers fresh generation (single module, no batch).
 */
export async function regenerateModuleContent(
  moduleId: string,
  reason?: RegenerationReason,
): Promise<GenerateModuleContentResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Rate limit: 3 regenerations per minute per user
    const rl = rateLimit(`regen:${user.id}`, 3);
    if (!rl.success) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    // Fetch the module
    const { data: moduleData, error: moduleError } = await supabase
      .from("learning_modules")
      .select("id, content, learning_path_id")
      .eq("id", moduleId)
      .single();

    if (moduleError || !moduleData) {
      return { success: false, error: "Module not found" };
    }

    // Verify user owns the learning path
    const { data: pathData, error: pathError } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", moduleData.learning_path_id)
      .eq("user_id", user.id)
      .single();

    if (pathError || !pathData) {
      return { success: false, error: "Learning path not found" };
    }

    const content = moduleData.content as unknown as ModuleContentWithMeta;

    if (!content._meta) {
      return { success: false, error: "module_metadata_missing" };
    }

    // Check regeneration limit
    const regenCount = content._regeneration_count ?? 0;
    const limitCheck = await checkRegenerationLimit(user.id, regenCount);
    if (!limitCheck.allowed) {
      return { success: false, error: "regeneration_limit_reached" };
    }

    // Reset content with regeneration metadata
    const serviceClient = createServiceClient();
    await serviceClient
      .from("learning_modules")
      .update({
        content: {
          sections: [],
          _meta: { ...content._meta, retry_count: 0 },
          _regeneration_count: regenCount + 1,
          _regeneration_hint: reason ?? undefined,
        } as unknown as Json,
      })
      .eq("id", moduleId);

    // Reset learning progress for this module
    await resetModuleProgress(moduleId);

    // Generate fresh content (single module, no batch)
    const result = await _generateContentForModule(moduleId, user.id, {
      skipBatch: true,
      regenerationHint: reason,
    });

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Internal: generate module content. Used by both generateModuleContent()
 * (on-demand, with auth) and prefetch (fire-and-forget, without auth).
 * Uses serviceClient so no auth context is required.
 */
async function _generateContentForModule(
  moduleId: string,
  userId: string,
  options?: { skipBatch?: boolean; regenerationHint?: RegenerationReason },
): Promise<GenerateModuleContentResult> {
  const serviceClient = createServiceClient();

  // Fetch the module
  const { data: moduleData, error: moduleError } = await serviceClient
    .from("learning_modules")
    .select(
      "id, title, description, module_type, content, learning_path_id",
    )
    .eq("id", moduleId)
    .single();

  if (moduleError || !moduleData) {
    return { success: false, error: "Module not found" };
  }

  const content = moduleData.content as unknown as ModuleContentWithMeta;

  // If content already exists, skip
  if (content.sections && content.sections.length > 0) {
    return { success: true, data: { sections: content.sections } };
  }

  // If currently generating and not stale (< 120s), skip
  if (content._status === "generating" && content._generating_since) {
    const sinceTime = new Date(content._generating_since).getTime();
    if (!Number.isNaN(sinceTime) && Date.now() - sinceTime < 120_000) {
      return { success: true, generating: true };
    }
  }

  if (!content._meta) {
    return { success: false, error: "Module has no metadata" };
  }

  const meta = content._meta;

  // ── Batch: find sibling modules with same tech_name needing content ──
  // Skip batching when regenerating a single module (hint is module-specific)
  let additionalModules: typeof siblingModulesPlaceholder = [];
  type SiblingModule = { id: string; title: string; description: string | null; module_type: string | null; content: Json; module_order: number };
  let siblingModulesPlaceholder: SiblingModule[] = [];

  if (!options?.skipBatch) {
    const { data: siblingModules } = await serviceClient
      .from("learning_modules")
      .select("id, title, description, module_type, content, module_order")
      .eq("learning_path_id", moduleData.learning_path_id)
      .neq("id", moduleId)
      .order("module_order", { ascending: true });

    const batchCandidates = (siblingModules ?? []).filter((m) => {
      const c = m.content as unknown as ModuleContentWithMeta;
      if (!c._meta || c._meta.tech_name !== meta.tech_name) return false;
      if (c.sections && c.sections.length > 0) return false;
      if (c._status === "generating" && c._generating_since) {
        const sinceTime = new Date(c._generating_since).getTime();
        if (!Number.isNaN(sinceTime) && Date.now() - sinceTime < 120_000) return false;
      }
      return true;
    });

    // Up to 6 additional modules (7 total with the requested one)
    additionalModules = batchCandidates.slice(0, 6);
  }

  interface BatchModule {
    id: string;
    title: string;
    description: string;
    module_type: string;
    meta: ModuleContentMeta;
    content: ModuleContentWithMeta;
  }

  const batchModules: BatchModule[] = [
    {
      id: moduleData.id,
      title: moduleData.title,
      description: moduleData.description ?? "",
      module_type: moduleData.module_type ?? "concept",
      meta,
      content,
    },
    ...additionalModules.map((m) => {
      const c = m.content as unknown as ModuleContentWithMeta;
      return {
        id: m.id,
        title: m.title,
        description: m.description ?? "",
        module_type: m.module_type ?? "concept",
        meta: c._meta!,
        content: c,
      };
    }),
  ];

  // Set optimistic lock on ALL batch modules
  const generatingSince = new Date().toISOString();
  await Promise.all(
    batchModules.map((m) =>
      serviceClient
        .from("learning_modules")
        .update({
          content: {
            ...m.content,
            _status: "generating",
            _generating_since: generatingSince,
          } as unknown as Json,
        })
        .eq("id", m.id),
    ),
  );

  // Helper to set error on all batch modules
  async function setBatchError(errorMsg: string) {
    await Promise.all(
      batchModules.map((m) =>
        serviceClient
          .from("learning_modules")
          .update({
            content: {
              sections: [],
              _meta: m.meta,
              _status: "error",
              _error: errorMsg,
            } as unknown as Json,
          })
          .eq("id", m.id),
      ),
    );
  }

  // Fetch learning path info
  const { data: pathData } = await serviceClient
    .from("learning_paths")
    .select("id, project_id, difficulty, locale")
    .eq("id", moduleData.learning_path_id)
    .single();

  if (!pathData) {
    await setBatchError("Learning path not found");
    return { success: false, error: "Learning path not found" };
  }

  const pathLocale = (pathData.locale as Locale) ?? "ko";

  // Merge relevant_files from all batch modules, deduplicate
  const allRelevantFiles = [
    ...new Set(batchModules.flatMap((m) => m.meta.relevant_files)),
  ];

  // Run all pre-LLM queries in parallel
  // Note: usage limit is checked in generateLearningPath (path creation),
  // not here — module content generation is part of an existing path.
  const [llmKeyResult, relevantFiles, educationalAnalysis] =
    await Promise.all([
      getDefaultLlmKeyWithDiagnosis(userId),
      loadRelevantFiles(pathData.project_id, allRelevantFiles),
      getEducationalAnalysis(pathData.project_id),
    ]);

  if (!llmKeyResult.data) {
    const errMsg = llmKeyErrorMessage(llmKeyResult.error);
    await setBatchError(errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
  const llmKeyData = llmKeyResult.data;

  const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);

  const difficulty = (pathData.difficulty ?? "beginner") as
    | "beginner"
    | "intermediate"
    | "advanced";

  // Load KB hints for this technology (cache → DB → seed fallback)
  let kbHints = await getKBHints(meta.tech_name, pathLocale);
  if (kbHints.length === 0) {
    kbHints = await generateKBForTech(meta.tech_name, null, provider, pathLocale);
  }

  // Build prompt for batch modules
  const contentPrompt = buildContentBatchPrompt(
    meta.tech_name,
    batchModules.map((m) => ({
      title: m.title,
      description: m.description,
      module_type: m.module_type,
      learning_objectives: m.meta.learning_objectives,
    })),
    relevantFiles,
    difficulty,
    educationalAnalysis ?? undefined,
    kbHints,
    pathLocale,
  );

  // Inject regeneration hint if present (appended to prompt for better LLM attention)
  let finalPrompt = contentPrompt;
  const regenHint = options?.regenerationHint ?? content._regeneration_hint;
  if (regenHint && REGENERATION_HINTS[regenHint]) {
    const hintText = REGENERATION_HINTS[regenHint][pathLocale] ?? REGENERATION_HINTS[regenHint].ko;
    finalPrompt += `\n\n## Student Feedback on Previous Content\n\n${hintText}\n\nPlease generate completely different content that addresses this feedback. Do NOT repeat the same structure or examples as before.`;
  }

  const llmResult = await provider.chat({
    messages: [{ role: "user", content: finalPrompt }],
    maxTokens: Math.min(batchModules.length * (difficulty === "beginner" ? 24000 : 16000), 128000),
  });

  let batchContent: ContentBatchItem[];
  try {
    batchContent = extractContentArray(llmResult.content);
  } catch (parseError) {
    console.error(
      `[learning] Content parse error for batch (${batchModules.map((m) => m.title).join(", ")}):`,
      parseError instanceof Error ? parseError.message : parseError,
    );
    await setBatchError("content_parse_error");
    return {
      success: false,
      error: "content_parse_error",
    };
  }

  // Match batch content to modules by normalized title
  const now = new Date().toISOString();
  let requestedModuleSections: ContentSection[] = [];

  const contentMap = new Map<string, ContentBatchItem>();
  for (const item of batchContent) {
    contentMap.set(normalizeTitle(item.module_title), item);
  }

  await Promise.all(
    batchModules.map(async (m) => {
      const matched = contentMap.get(normalizeTitle(m.title));
      const sections = matched?.content?.sections ?? [];

      // Extract concept_keys from LLM response (R6: Module→Concept coverage)
      const conceptKeys = Array.isArray(matched?.concept_keys)
        ? (matched.concept_keys as string[]).filter(
            (k): k is string => typeof k === "string" && k.length > 0,
          )
        : [];

      if (sections.length > 0 && _validateGeneratedSections(sections, difficulty)) {
        // Set requested module sections only for validated content
        if (m.id === moduleId) {
          requestedModuleSections = sections;
        }
        // Valid content — save
        if (sections.length < 5) {
          console.warn(
            `[learning] Module "${m.title}" has only ${sections.length} sections (expected 5-8). Content may be thin.`,
          );
        }
        await serviceClient
          .from("learning_modules")
          .update({
            content: {
              sections,
              _meta: m.meta,
              _status: "ready",
              _generated_at: now,
            } as unknown as Json,
            ...(conceptKeys.length > 0 ? { concept_keys: conceptKeys } : {}),
          })
          .eq("id", m.id);
      } else if (sections.length > 0) {
        // Content exists but fails validation — track retries
        const currentRetry = (typeof m.meta?.retry_count === "number" ? m.meta.retry_count : 0);
        const nextRetry = currentRetry + 1;

        if (nextRetry > 3) {
          console.warn(
            `[learning] Module "${m.title}" failed validation ${nextRetry} times. Saving as validation_failed.`,
          );
          await serviceClient
            .from("learning_modules")
            .update({
              content: {
                sections,
                _meta: { ...m.meta, retry_count: nextRetry },
                _status: "validation_failed",
                _generated_at: now,
              } as unknown as Json,
            })
            .eq("id", m.id);
        } else {
          console.warn(
            `[learning] Module "${m.title}" failed validation (attempt ${nextRetry}/3). Resetting for retry.`,
          );
          await serviceClient
            .from("learning_modules")
            .update({
              content: {
                sections: [],
                _meta: { ...m.meta, retry_count: nextRetry },
              } as unknown as Json,
            })
            .eq("id", m.id);
        }
      } else {
        // No match — reset status so it can be retried individually
        console.warn(
          `[learning] Module "${m.title}" got no content from LLM batch. Will be retried on next request.`,
        );
        await serviceClient
          .from("learning_modules")
          .update({
            content: {
              sections: [],
              _meta: m.meta,
            } as unknown as Json,
          })
          .eq("id", m.id);
      }
    }),
  );

  // Track token usage
  const jobInsert: AnalysisJobInsert = {
    project_id: pathData.project_id,
    user_id: userId,
    job_type: "learning_generation",
    status: "completed",
    llm_provider: provider.providerName,
    llm_model: provider.modelName,
    input_tokens: llmResult.input_tokens,
    output_tokens: llmResult.output_tokens,
    started_at: now,
    completed_at: now,
  };

  await serviceClient.from("analysis_jobs").insert(jobInsert);

  return { success: true, data: { sections: requestedModuleSections } };
}

/**
 * Background: generate all module content with parallel batching.
 * Called via after() for Pro/Team users after learning path creation.
 * Groups modules by tech_name and processes up to 2 tech groups concurrently.
 * Skips already-generated or currently-generating modules.
 */
async function _generateAllModuleContentInBackground(
  moduleIds: string[],
  userId: string,
): Promise<void> {
  if (moduleIds.length === 0) return;

  const serviceClient = createServiceClient();

  // Fetch all modules to group by tech_name
  const { data: modules, error: fetchError } = await serviceClient
    .from("learning_modules")
    .select("id, content, module_order")
    .in("id", moduleIds)
    .order("module_order", { ascending: true });

  if (fetchError) {
    console.error("[learning] Background: failed to fetch modules:", fetchError.message);
    return;
  }
  if (!modules || modules.length === 0) return;

  // Group module IDs by tech_name
  const techGroups = new Map<string, string[]>();
  for (const mod of modules) {
    const content = mod.content as unknown as ModuleContentWithMeta;
    const techName = content._meta?.tech_name ?? "__unknown__";
    if (!techGroups.has(techName)) techGroups.set(techName, []);
    techGroups.get(techName)!.push(mod.id);
  }

  // Process tech groups in parallel (max 2 concurrent to respect API rate limits)
  const groups = [...techGroups.values()];
  const MAX_CONCURRENT = 3;

  for (let i = 0; i < groups.length; i += MAX_CONCURRENT) {
    const batch = groups.slice(i, i + MAX_CONCURRENT);
    await Promise.allSettled(
      batch.map(async (groupModuleIds) => {
        for (const modId of groupModuleIds) {
          // Re-check status before generating (another group may have covered it)
          const { data: mod } = await serviceClient
            .from("learning_modules")
            .select("content")
            .eq("id", modId)
            .single();
          if (!mod) continue;
          const modContent = mod.content as unknown as ModuleContentWithMeta;
          if (modContent.sections && modContent.sections.length > 0) continue;
          if (modContent._status === "generating" && modContent._generating_since) {
            const sinceTime = new Date(modContent._generating_since).getTime();
            if (!Number.isNaN(sinceTime) && Date.now() - sinceTime < 120_000) continue;
          }
          try {
            await _generateContentForModule(modId, userId);
          } catch (err) {
            console.error(`[learning] Background: module ${modId} failed:`, err instanceof Error ? err.message : err);
          }
        }
      }),
    );
  }
}

/**
 * R4' — Compute and persist Module→Module prerequisites for a learning path.
 * Uses R1 (Concept→Concept DAG from KB) + R6 (Module→Concept coverage) to derive
 * module-level prerequisite relationships algorithmically.
 *
 * Called in background after curriculum content generation completes.
 */
export async function updatePrerequisitesForPath(pathId: string): Promise<void> {
  try {
    const serviceClient = createServiceClient();

    // 1. Get all modules for this path with concept_keys
    const { data: modules } = await serviceClient
      .from("learning_modules")
      .select("id, concept_keys, module_order, tech_stack_id")
      .eq("learning_path_id", pathId)
      .order("module_order", { ascending: true });

    if (!modules || modules.length === 0) return;

    // Filter modules with concept_keys
    const modulesWithConcepts = modules
      .filter((m) => Array.isArray(m.concept_keys) && (m.concept_keys as string[]).length > 0)
      .map((m) => ({
        moduleId: m.id,
        conceptKeys: m.concept_keys as string[],
        moduleOrder: m.module_order,
      }));

    if (modulesWithConcepts.length === 0) return;

    // 2. Collect all concept_keys across modules
    const allConceptKeys = new Set<string>();
    for (const m of modulesWithConcepts) {
      for (const ck of m.conceptKeys) allConceptKeys.add(ck);
    }

    // 3. Get learning path's project to find tech stacks
    const { data: pathData } = await serviceClient
      .from("learning_paths")
      .select("project_id")
      .eq("id", pathId)
      .single();

    if (!pathData) return;

    // 4. Get tech stacks for the project
    const { data: techStacks } = await serviceClient
      .from("tech_stacks")
      .select("technology_name")
      .eq("project_id", pathData.project_id);

    if (!techStacks) return;

    const normalizedNames = techStacks.map((ts) => ts.technology_name.toLowerCase().trim());

    // 5. Fetch KB entries to get concept prerequisite relationships (R1)
    // Use untyped client because technology_knowledge is not in Database type
    const { createClient: createUntypedClient } = await import("@supabase/supabase-js");
    const kbClient = createUntypedClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: knowledgeRows } = await kbClient
      .from("technology_knowledge")
      .select("concepts")
      .in("technology_name_normalized", normalizedNames)
      .eq("generation_status", "ready");

    if (!knowledgeRows || knowledgeRows.length === 0) return;

    // 6. Build concept prerequisite map: concept_key → prerequisite concept_keys[]
    const conceptPrereqs = new Map<string, string[]>();
    for (const row of knowledgeRows) {
      const concepts = row.concepts as Array<{
        concept_key: string;
        prerequisite_concepts: string[];
      }>;
      for (const concept of concepts) {
        if (concept.prerequisite_concepts && concept.prerequisite_concepts.length > 0) {
          conceptPrereqs.set(concept.concept_key, concept.prerequisite_concepts);
        }
      }
    }

    // 7. Compute module prerequisites
    const modulePrereqs = computeModulePrerequisites(modulesWithConcepts, conceptPrereqs);

    // 8. Update learning_modules.prerequisites
    for (const mod of modules) {
      const prereqs = modulePrereqs.get(mod.id);
      if (prereqs && prereqs.length > 0) {
        await serviceClient
          .from("learning_modules")
          .update({ prerequisites: prereqs })
          .eq("id", mod.id);
      }
    }
  } catch (err) {
    console.error("[learning] updatePrerequisitesForPath failed:", err instanceof Error ? err.message : err);
  }
}

/**
 * Prefetch the next module's content in the background.
 * Called from the client after the current module finishes loading.
 * Triggers batch generation, so sibling modules with the same tech_name
 * are also generated in a single LLM call.
 */
export async function prefetchNextModuleContent(
  currentModuleId: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return;

    const serviceClient = createServiceClient();

    // Get current module's path and order
    const { data: currentModule } = await serviceClient
      .from("learning_modules")
      .select("learning_path_id, module_order")
      .eq("id", currentModuleId)
      .single();

    if (!currentModule) return;

    // Find the next 3 modules by order
    const { data: nextModules } = await serviceClient
      .from("learning_modules")
      .select("id, content")
      .eq("learning_path_id", currentModule.learning_path_id)
      .gt("module_order", currentModule.module_order)
      .order("module_order", { ascending: true })
      .limit(3);

    if (!nextModules || nextModules.length === 0) return;

    for (const nextModule of nextModules) {
      const nextContent = nextModule.content as unknown as ModuleContentWithMeta;

      // Skip if already has content or is currently generating
      if (nextContent.sections && nextContent.sections.length > 0) continue;
      if (nextContent._status === "generating" && nextContent._generating_since) {
        const sinceTime = new Date(nextContent._generating_since).getTime();
        if (!Number.isNaN(sinceTime) && Date.now() - sinceTime < 120_000) continue;
      }

      // Fire-and-forget: batch generation will also cover sibling modules
      _generateContentForModule(nextModule.id, user.id).catch(() => {});
    }
  } catch {
    // Silently ignore prefetch errors
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyForUser } from "@/server/actions/llm-keys";
import { checkUsageLimit } from "@/lib/utils/usage-limits";
import {
  buildStructurePrompt,
  buildContentBatchPrompt,
} from "@/lib/prompts/learning-roadmap";
import { buildProjectDigest } from "@/lib/learning/project-digest";
import { buildTutorPrompt } from "@/lib/prompts/tutor-chat";
import { decryptContent } from "@/lib/utils/content-encryption";
import type { Database, Json } from "@/types/database";

// ─── Type Aliases ────────────────────────────────────────────────────

type Difficulty = Database["public"]["Enums"]["difficulty"];
type ModuleType = Database["public"]["Enums"]["module_type"];
type LearningPathInsert = Database["public"]["Tables"]["learning_paths"]["Insert"];
type LearningModuleInsert = Database["public"]["Tables"]["learning_modules"]["Insert"];
type AnalysisJobInsert = Database["public"]["Tables"]["analysis_jobs"]["Insert"];
type AnalysisJobUpdate = Database["public"]["Tables"]["analysis_jobs"]["Update"];
type LearningProgressInsert = Database["public"]["Tables"]["learning_progress"]["Insert"];
type LearningProgressUpdate = Database["public"]["Tables"]["learning_progress"]["Update"];

// ─── Response Types ──────────────────────────────────────────────────

interface GenerateLearningPathResult {
  success: boolean;
  data?: {
    learning_path_id: string;
    title: string;
    total_modules: number;
  };
  error?: string;
}

interface LearningPathItem {
  id: string;
  title: string;
  description: string | null;
  difficulty: Difficulty | null;
  estimated_hours: number | null;
  total_modules: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LearningPathListResult {
  success: boolean;
  data?: LearningPathItem[];
  error?: string;
}

interface ModuleItem {
  id: string;
  title: string;
  description: string | null;
  module_type: ModuleType | null;
  module_order: number;
  estimated_minutes: number | null;
  tech_stack_id: string | null;
  progress?: {
    status: string;
    score: number | null;
    time_spent: number | null;
    completed_at: string | null;
  };
}

interface LearningPathDetail {
  id: string;
  title: string;
  description: string | null;
  difficulty: Difficulty | null;
  estimated_hours: number | null;
  total_modules: number;
  status: string;
  llm_provider: string | null;
  created_at: string;
  updated_at: string;
  modules: ModuleItem[];
}

interface LearningPathDetailResult {
  success: boolean;
  data?: LearningPathDetail;
  error?: string;
}

interface ContentSection {
  type: string;
  title: string;
  body: string;
  code?: string;
  quiz_options?: string[];
  quiz_answer?: number;
}

interface ModuleContent {
  sections: ContentSection[];
}

interface LearningModuleDetail {
  id: string;
  title: string;
  description: string | null;
  module_type: ModuleType | null;
  module_order: number;
  estimated_minutes: number | null;
  tech_stack_id: string | null;
  content: ModuleContent;
  learning_path_id: string;
  progress?: {
    status: string;
    score: number | null;
    time_spent: number | null;
    attempts: number;
    completed_at: string | null;
  };
}

interface LearningModuleDetailResult {
  success: boolean;
  data?: LearningModuleDetail;
  error?: string;
}

interface UpdateProgressResult {
  success: boolean;
  error?: string;
}

interface SendTutorMessageResult {
  success: boolean;
  data?: {
    conversation_id: string;
    response: string;
    tokens_used: number;
  };
  error?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatHistoryResult {
  success: boolean;
  data?: ChatMessage[];
  error?: string;
}

interface ConversationItem {
  id: string;
  title: string | null;
  context_type: string | null;
  total_tokens: number;
  learning_path_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ConversationListResult {
  success: boolean;
  data?: ConversationItem[];
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
  content: {
    sections: Array<{
      type: string;
      title: string;
      body: string;
      code?: string;
      quiz_options?: string[];
      quiz_answer?: number;
    }>;
  };
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

    // Get user's default LLM key
    const llmKeyData = await getDefaultLlmKeyForUser(user.id);
    if (!llmKeyData) {
      return {
        success: false,
        error:
          "No LLM API key configured. Please add an API key in settings.",
      };
    }

    // Create LLM provider
    const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);

    // Build project digest for personalized content
    const digest = await buildProjectDigest(projectId);

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
    );

    const structureResult = await provider.chat({
      messages: [{ role: "user", content: structurePrompt }],
      maxTokens: 16384,
    });

    let totalInputTokens = structureResult.input_tokens;
    let totalOutputTokens = structureResult.output_tokens;

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

    // ─── Phase 2: Generate content in batches by tech_name ────────────
    // Group modules by tech_name for batch processing
    const techBatches = new Map<string, StructureModuleResponse[]>();
    for (const mod of structure.modules) {
      const key = mod.tech_name.toLowerCase();
      const batch = techBatches.get(key) ?? [];
      batch.push(mod);
      techBatches.set(key, batch);
    }

    // Build content map: module_title -> content
    // Uses both exact and normalized title matching, plus index-based fallback.
    const contentMap = new Map<
      string,
      ContentBatchItem["content"]
    >();
    // Normalized title -> content for fuzzy matching
    const normalizedContentMap = new Map<
      string,
      ContentBatchItem["content"]
    >();
    // Per-batch index fallback: structureModuleTitle -> content
    const indexFallbackMap = new Map<
      string,
      ContentBatchItem["content"]
    >();

    for (const [, batchModules] of techBatches) {
      // Collect relevant code from digest for this batch
      const relevantPaths = new Set<string>();
      for (const mod of batchModules) {
        for (const fp of mod.relevant_files ?? []) {
          relevantPaths.add(fp);
        }
      }

      const relevantCode = digest.criticalFiles.filter((f) =>
        relevantPaths.has(f.path),
      );

      const techName = batchModules[0].tech_name;

      const contentPrompt = buildContentBatchPrompt(
        techName,
        batchModules.map((m) => ({
          title: m.title,
          description: m.description,
          module_type: m.module_type,
          learning_objectives: m.learning_objectives ?? [],
        })),
        relevantCode,
        difficulty,
      );

      const contentResult = await provider.chat({
        messages: [{ role: "user", content: contentPrompt }],
        maxTokens: 16384,
      });

      totalInputTokens += contentResult.input_tokens;
      totalOutputTokens += contentResult.output_tokens;

      let batchContent: ContentBatchItem[];
      try {
        batchContent = extractContentArray(contentResult.content);
      } catch (batchParseError) {
        console.error(
          `[learning] Phase 2 parse error for tech "${techName}":`,
          batchParseError instanceof Error ? batchParseError.message : batchParseError,
        );
        console.error(
          "[learning] Raw Phase 2 response (first 500 chars):",
          contentResult.content.slice(0, 500),
        );
        batchContent = [];
      }

      // Store by exact title and normalized title
      for (const item of batchContent) {
        contentMap.set(item.module_title.trim(), item.content);
        normalizedContentMap.set(normalizeTitle(item.module_title), item.content);
      }

      // Index-based fallback: match Phase 2 items to Phase 1 modules by position
      // This handles cases where titles differ but the order is preserved
      if (batchContent.length === batchModules.length) {
        for (let i = 0; i < batchModules.length; i++) {
          indexFallbackMap.set(batchModules[i].title, batchContent[i].content);
        }
      } else if (batchContent.length > 0) {
        // Partial match: assign what we can by index
        const limit = Math.min(batchContent.length, batchModules.length);
        for (let i = 0; i < limit; i++) {
          indexFallbackMap.set(batchModules[i].title, batchContent[i].content);
        }
      }

      console.log(
        `[learning] Phase 2 batch "${techName}": expected ${batchModules.length} modules, got ${batchContent.length} items`,
      );
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

    // Create learning_paths record
    const pathInsert: LearningPathInsert = {
      project_id: projectId,
      user_id: user.id,
      title: structure.title,
      description: structure.description ?? null,
      difficulty: roadmapDifficulty,
      estimated_hours: structure.estimated_hours ?? null,
      total_modules: structure.modules.length,
      llm_provider: provider.providerName,
      status: "active",
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

    // Create learning_modules records with Phase 2 content
    const moduleInserts: LearningModuleInsert[] = structure.modules.map(
      (mod, index) => {
        const moduleType = VALID_MODULE_TYPES.has(
          mod.module_type as ModuleType,
        )
          ? (mod.module_type as ModuleType)
          : "concept";

        const techStackId =
          techNameToId.get(mod.tech_name.toLowerCase()) ?? null;

        // Look up content from Phase 2 batch results
        // 1. Exact match → 2. Normalized match → 3. Index fallback → 4. Empty
        const content = contentMap.get(mod.title)
          ?? contentMap.get(mod.title.trim())
          ?? normalizedContentMap.get(normalizeTitle(mod.title))
          ?? indexFallbackMap.get(mod.title)
          ?? { sections: [] };

        if (!content.sections || content.sections.length === 0) {
          console.warn(
            `[learning] No content matched for module "${mod.title}" (tech: ${mod.tech_name})`,
          );
        }

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

    const { error: modulesError } = await serviceClient
      .from("learning_modules")
      .insert(moduleInserts);

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

    return {
      success: true,
      data: {
        learning_path_id: learningPath.id,
        title: structure.title,
        total_modules: structure.modules.length,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

export async function getLearningPaths(
  projectId: string,
): Promise<LearningPathListResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    const { data, error } = await supabase
      .from("learning_paths")
      .select(
        "id, title, description, difficulty, estimated_hours, total_modules, status, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch learning paths" };
    }

    return { success: true, data: (data ?? []) as LearningPathItem[] };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getLearningPathDetail(
  pathId: string,
): Promise<LearningPathDetailResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch learning path
    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select(
        "id, title, description, difficulty, estimated_hours, total_modules, status, llm_provider, created_at, updated_at",
      )
      .eq("id", pathId)
      .eq("user_id", user.id)
      .single();

    if (pathError || !path) {
      return { success: false, error: "Learning path not found" };
    }

    // Fetch modules
    const { data: modules, error: modulesError } = await supabase
      .from("learning_modules")
      .select(
        "id, title, description, module_type, module_order, estimated_minutes, tech_stack_id",
      )
      .eq("learning_path_id", pathId)
      .order("module_order", { ascending: true });

    if (modulesError) {
      return { success: false, error: "Failed to fetch modules" };
    }

    // Fetch progress for all modules
    const moduleIds = (modules ?? []).map((m) => m.id);
    let progressMap = new Map<
      string,
      {
        status: string;
        score: number | null;
        time_spent: number | null;
        completed_at: string | null;
      }
    >();

    if (moduleIds.length > 0) {
      const { data: progressData } = await supabase
        .from("learning_progress")
        .select("module_id, status, score, time_spent, completed_at")
        .eq("user_id", user.id)
        .in("module_id", moduleIds);

      if (progressData) {
        progressMap = new Map(
          progressData.map((p) => [
            p.module_id,
            {
              status: p.status,
              score: p.score,
              time_spent: p.time_spent,
              completed_at: p.completed_at,
            },
          ]),
        );
      }
    }

    const modulesWithProgress: ModuleItem[] = (modules ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      module_type: m.module_type,
      module_order: m.module_order,
      estimated_minutes: m.estimated_minutes,
      tech_stack_id: m.tech_stack_id,
      progress: progressMap.get(m.id),
    }));

    return {
      success: true,
      data: {
        id: path.id,
        title: path.title,
        description: path.description,
        difficulty: path.difficulty,
        estimated_hours: path.estimated_hours,
        total_modules: path.total_modules,
        status: path.status,
        llm_provider: path.llm_provider,
        created_at: path.created_at,
        updated_at: path.updated_at,
        modules: modulesWithProgress,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getLearningModule(
  moduleId: string,
): Promise<LearningModuleDetailResult> {
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
        "id, title, description, module_type, module_order, estimated_minutes, tech_stack_id, content, learning_path_id",
      )
      .eq("id", moduleId)
      .single();

    if (moduleError || !moduleData) {
      return { success: false, error: "Module not found" };
    }

    // Verify user owns the learning path
    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", moduleData.learning_path_id)
      .eq("user_id", user.id)
      .single();

    if (pathError || !path) {
      return { success: false, error: "Learning path not found" };
    }

    // Fetch progress for this module
    const { data: progressData } = await supabase
      .from("learning_progress")
      .select("status, score, time_spent, attempts, completed_at")
      .eq("module_id", moduleId)
      .eq("user_id", user.id)
      .single();

    const progress = progressData
      ? {
          status: progressData.status,
          score: progressData.score,
          time_spent: progressData.time_spent,
          attempts: progressData.attempts,
          completed_at: progressData.completed_at,
        }
      : undefined;

    return {
      success: true,
      data: {
        id: moduleData.id,
        title: moduleData.title,
        description: moduleData.description,
        module_type: moduleData.module_type,
        module_order: moduleData.module_order,
        estimated_minutes: moduleData.estimated_minutes,
        tech_stack_id: moduleData.tech_stack_id,
        content: moduleData.content as unknown as ModuleContent,
        learning_path_id: moduleData.learning_path_id,
        progress,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateLearningProgress(
  moduleId: string,
  status: "in_progress" | "completed" | "skipped",
  score?: number,
  timeSpent?: number,
): Promise<UpdateProgressResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the module exists and user owns the learning path
    const { data: moduleData, error: moduleError } = await supabase
      .from("learning_modules")
      .select("id, learning_path_id")
      .eq("id", moduleId)
      .single();

    if (moduleError || !moduleData) {
      return { success: false, error: "Module not found" };
    }

    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", moduleData.learning_path_id)
      .eq("user_id", user.id)
      .single();

    if (pathError || !path) {
      return { success: false, error: "Learning path not found" };
    }

    // Check if progress record already exists
    const { data: existing } = await supabase
      .from("learning_progress")
      .select("id, attempts")
      .eq("module_id", moduleId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Update existing progress
      const progressUpdate: LearningProgressUpdate = {
        status,
        score: score ?? null,
        time_spent: timeSpent ?? null,
        attempts: existing.attempts + 1,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("learning_progress")
        .update(progressUpdate)
        .eq("id", existing.id)
        .eq("user_id", user.id);

      if (updateError) {
        return { success: false, error: "Failed to update progress" };
      }
    } else {
      // Insert new progress record using service client
      const serviceClient = createServiceClient();

      const progressInsert: LearningProgressInsert = {
        user_id: user.id,
        module_id: moduleId,
        status,
        score: score ?? null,
        time_spent: timeSpent ?? null,
        attempts: 1,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      };

      const { error: insertError } = await serviceClient
        .from("learning_progress")
        .insert(progressInsert);

      if (insertError) {
        return { success: false, error: "Failed to create progress record" };
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function sendTutorMessage(
  projectId: string,
  message: string,
  conversationId?: string,
  learningPathId?: string,
): Promise<SendTutorMessageResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check usage limit for new conversations
    if (!conversationId) {
      const usageCheck = await checkUsageLimit(user.id, "chat");
      if (!usageCheck.allowed) {
        return {
          success: false,
          error: usageCheck.upgrade_message ?? "Usage limit reached",
        };
      }
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    // Load project files and tech stacks
    const { data: projectFiles } = await supabase
      .from("project_files")
      .select("file_name, raw_content")
      .eq("project_id", projectId)
      .not("raw_content", "is", null)
      .limit(10);

    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select("technology_name, category, description")
      .eq("project_id", projectId);

    // Build learning context if a learning path ID is provided
    let learningContext:
      | { path_title: string; current_module: string }
      | undefined;

    if (learningPathId) {
      const { data: pathData } = await supabase
        .from("learning_paths")
        .select("title")
        .eq("id", learningPathId)
        .eq("user_id", user.id)
        .single();

      if (pathData) {
        // Find the current module (first in_progress or first not_started)
        const { data: modules } = await supabase
          .from("learning_modules")
          .select("id, title")
          .eq("learning_path_id", learningPathId)
          .order("module_order", { ascending: true })
          .limit(1);

        learningContext = {
          path_title: pathData.title,
          current_module: modules?.[0]?.title ?? "Getting started",
        };
      }
    }

    // Build system prompt
    const systemPrompt = buildTutorPrompt(
      (techStacks ?? []).map((t) => ({
        technology_name: t.technology_name,
        category: t.category,
        description: t.description,
      })),
      (projectFiles ?? [])
        .filter(
          (f): f is { file_name: string; raw_content: string } =>
            f.raw_content !== null,
        )
        .map((f) => ({
          file_name: f.file_name,
          raw_content: decryptContent(f.raw_content),
        })),
      learningContext,
    );

    // Load existing conversation history if continuing
    let existingMessages: ChatMessage[] = [];
    let existingConversationId: string | null = conversationId ?? null;

    if (existingConversationId) {
      const { data: conversationData } = await supabase
        .from("ai_conversations")
        .select("messages")
        .eq("id", existingConversationId)
        .eq("user_id", user.id)
        .single();

      if (conversationData) {
        existingMessages = conversationData.messages as unknown as ChatMessage[];
      }
    }

    // Assemble messages array
    const allMessages: ChatMessage[] = [
      { role: "system" as const, content: systemPrompt },
      ...existingMessages.filter((m) => m.role !== "system"),
      { role: "user" as const, content: message },
    ];

    // Get user's default LLM key
    const llmKeyData = await getDefaultLlmKeyForUser(user.id);
    if (!llmKeyData) {
      return {
        success: false,
        error:
          "No LLM API key configured. Please add an API key in settings.",
      };
    }

    // Create LLM provider and call chat
    const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);
    const chatResult = await provider.chat({
      messages: allMessages,
    });

    const totalTokens = chatResult.input_tokens + chatResult.output_tokens;

    // Store the new messages (user + assistant) in the conversation
    const updatedMessages: ChatMessage[] = [
      ...existingMessages.filter((m) => m.role !== "system"),
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: chatResult.content },
    ];

    const serviceClient = createServiceClient();

    if (existingConversationId) {
      // Update existing conversation
      const { error: updateError } = await serviceClient
        .from("ai_conversations")
        .update({
          messages: updatedMessages as unknown as Json,
          total_tokens: totalTokens,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConversationId);

      if (updateError) {
        return {
          success: false,
          error: "Failed to update conversation history",
        };
      }
    } else {
      // Create new conversation
      const conversationTitle =
        message.length > 80 ? message.slice(0, 80) + "..." : message;

      const { data: newConversation, error: insertError } = await serviceClient
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          project_id: projectId,
          learning_path_id: learningPathId ?? null,
          title: conversationTitle,
          messages: updatedMessages as unknown as Json,
          context_type: learningPathId ? "learning" : "general",
          llm_provider: provider.providerName,
          total_tokens: totalTokens,
        })
        .select("id")
        .single();

      if (insertError || !newConversation) {
        return {
          success: false,
          error: "Failed to create conversation",
        };
      }

      existingConversationId = newConversation.id;
    }

    return {
      success: true,
      data: {
        conversation_id: existingConversationId,
        response: chatResult.content,
        tokens_used: totalTokens,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: errorMessage };
  }
}

export async function getChatHistory(
  conversationId: string,
): Promise<ChatHistoryResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .select("messages")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return { success: false, error: "Conversation not found" };
    }

    return {
      success: true,
      data: data.messages as unknown as ChatMessage[],
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function listConversations(
  projectId: string,
): Promise<ConversationListResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .select(
        "id, title, context_type, total_tokens, learning_path_id, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch conversations" };
    }

    return { success: true, data: (data ?? []) as ConversationItem[] };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

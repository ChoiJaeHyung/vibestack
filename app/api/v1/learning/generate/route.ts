import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyForUser } from "@/server/actions/llm-keys";
import { checkUsageLimit } from "@/lib/utils/usage-limits";
import { buildRoadmapPrompt } from "@/lib/prompts/learning-roadmap";
import type { Database, Json } from "@/types/database";

type Difficulty = Database["public"]["Enums"]["difficulty"];
type ModuleType = Database["public"]["Enums"]["module_type"];
type LearningPathInsert = Database["public"]["Tables"]["learning_paths"]["Insert"];
type LearningModuleInsert = Database["public"]["Tables"]["learning_modules"]["Insert"];
type AnalysisJobInsert = Database["public"]["Tables"]["analysis_jobs"]["Insert"];

interface GenerateRequestBody {
  project_id: string;
  difficulty?: Difficulty;
}

interface GenerateResponseData {
  learning_path_id: string;
  title: string;
  total_modules: number;
}

interface RoadmapModuleResponse {
  title: string;
  description: string;
  module_type: string;
  estimated_minutes: number;
  tech_name: string;
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

interface RoadmapResponse {
  title: string;
  description: string;
  difficulty: string;
  estimated_hours: number;
  modules: RoadmapModuleResponse[];
}

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

export async function POST(request: NextRequest) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const body = (await request.json()) as GenerateRequestBody;

    if (!body.project_id) {
      return errorResponse("project_id is required", 400);
    }

    // Check usage limit
    const usageCheck = await checkUsageLimit(authResult.userId, "learning");
    if (!usageCheck.allowed) {
      return errorResponse(
        usageCheck.upgrade_message ?? "Usage limit reached",
        403,
      );
    }

    const supabase = createServiceClient();

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status")
      .eq("id", body.project_id)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    // Load tech stacks
    const { data: techStacks, error: techError } = await supabase
      .from("tech_stacks")
      .select("id, technology_name, category, importance, version, description")
      .eq("project_id", body.project_id)
      .order("confidence_score", { ascending: false });

    if (techError || !techStacks || techStacks.length === 0) {
      return errorResponse(
        "No tech stacks found. Please analyze the project first.",
        400,
      );
    }

    // Get user's default LLM key
    const llmKeyData = await getDefaultLlmKeyForUser(authResult.userId);
    if (!llmKeyData) {
      return errorResponse(
        "No LLM API key configured. Please add an API key in settings.",
        400,
      );
    }

    // Create LLM provider
    const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);
    const difficulty = body.difficulty ?? undefined;

    // Build prompt
    const prompt = buildRoadmapPrompt(
      techStacks.map((t) => ({
        technology_name: t.technology_name,
        category: t.category,
        importance: t.importance,
        version: t.version,
        description: t.description,
      })),
      difficulty,
    );

    // Call LLM
    const chatResult = await provider.chat({
      messages: [{ role: "user", content: prompt }],
    });

    // Parse response
    const cleanedResponse = stripCodeFences(chatResult.content);
    let roadmap: RoadmapResponse;
    try {
      roadmap = JSON.parse(cleanedResponse) as RoadmapResponse;
    } catch {
      return errorResponse(
        "Failed to parse learning roadmap from LLM response",
        500,
      );
    }

    const roadmapDifficulty = VALID_DIFFICULTIES.has(
      roadmap.difficulty as Difficulty,
    )
      ? (roadmap.difficulty as Difficulty)
      : difficulty ?? "beginner";

    // Create learning path
    const pathInsert: LearningPathInsert = {
      project_id: body.project_id,
      user_id: authResult.userId,
      title: roadmap.title,
      description: roadmap.description ?? null,
      difficulty: roadmapDifficulty,
      estimated_hours: roadmap.estimated_hours ?? null,
      total_modules: roadmap.modules.length,
      llm_provider: provider.providerName,
      status: "active",
    };

    const { data: learningPath, error: pathError } = await supabase
      .from("learning_paths")
      .insert(pathInsert)
      .select("id")
      .single();

    if (pathError || !learningPath) {
      return errorResponse("Failed to create learning path", 500);
    }

    // Build tech name to ID map
    const techNameToId = new Map<string, string>();
    for (const tech of techStacks) {
      techNameToId.set(tech.technology_name.toLowerCase(), tech.id);
    }

    // Create modules
    const moduleInserts: LearningModuleInsert[] = roadmap.modules.map(
      (mod, index) => {
        const moduleType = VALID_MODULE_TYPES.has(
          mod.module_type as ModuleType,
        )
          ? (mod.module_type as ModuleType)
          : "concept";

        const techStackId =
          techNameToId.get(mod.tech_name.toLowerCase()) ?? null;

        return {
          learning_path_id: learningPath.id,
          title: mod.title,
          description: mod.description ?? null,
          module_type: moduleType,
          module_order: index + 1,
          estimated_minutes: mod.estimated_minutes ?? null,
          tech_stack_id: techStackId,
          content: mod.content as unknown as Json,
        };
      },
    );

    const { error: modulesError } = await supabase
      .from("learning_modules")
      .insert(moduleInserts);

    if (modulesError) {
      return errorResponse("Failed to create learning modules", 500);
    }

    // Track the job
    const jobInsert: AnalysisJobInsert = {
      project_id: body.project_id,
      user_id: authResult.userId,
      job_type: "learning_generation",
      status: "completed",
      llm_provider: provider.providerName,
      llm_model: provider.modelName,
      input_tokens: chatResult.input_tokens,
      output_tokens: chatResult.output_tokens,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    await supabase.from("analysis_jobs").insert(jobInsert);

    return successResponse<GenerateResponseData>({
      learning_path_id: learningPath.id,
      title: roadmap.title,
      total_modules: roadmap.modules.length,
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

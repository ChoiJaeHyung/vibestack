import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { validateModule, VALID_DIFFICULTIES } from "@/lib/utils/curriculum-validation";
import type { Database, Json } from "@/types/database";

type Difficulty = Database["public"]["Enums"]["difficulty"];
type ModuleType = Database["public"]["Enums"]["module_type"];
type LearningPathInsert = Database["public"]["Tables"]["learning_paths"]["Insert"];
type LearningModuleInsert = Database["public"]["Tables"]["learning_modules"]["Insert"];

// ─── Curriculum validation types ─────────────────────────────────────

interface CurriculumModule {
  title: string;
  description: string;
  module_type: string;
  estimated_minutes?: number;
  tech_name: string;
  concept_keys?: string[];
  content: {
    sections: Array<{
      type: string;
      title: string;
      body: string;
      code?: string;
      quiz_options?: string[];
      quiz_answer?: number;
      quiz_explanation?: string;
      challenge_starter_code?: string;
      challenge_answer_code?: string;
    }>;
  };
}

interface Curriculum {
  title: string;
  description: string;
  difficulty: string;
  estimated_hours?: number;
  modules: CurriculumModule[];
}

function validateCurriculum(data: unknown): { valid: true; curriculum: Curriculum } | { valid: false; error: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "curriculum must be an object" };
  }

  const c = data as Record<string, unknown>;

  if (typeof c.title !== "string" || c.title.length === 0) {
    return { valid: false, error: "curriculum.title is required" };
  }
  if (typeof c.description !== "string" || c.description.length === 0) {
    return { valid: false, error: "curriculum.description is required" };
  }
  if (!VALID_DIFFICULTIES.includes(c.difficulty as string)) {
    return { valid: false, error: `curriculum.difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}` };
  }
  if (!Array.isArray(c.modules) || c.modules.length === 0) {
    return { valid: false, error: "curriculum.modules must be a non-empty array" };
  }
  if (c.modules.length < 10) {
    return { valid: false, error: `curriculum must have at least 10 modules (received ${c.modules.length}). Generate more comprehensive content.` };
  }
  if (c.modules.length > 50) {
    return { valid: false, error: "curriculum.modules cannot exceed 50 modules" };
  }

  // Validate each module using shared utility
  for (let i = 0; i < c.modules.length; i++) {
    const result = validateModule(c.modules[i], i, c.difficulty as string);
    if (!result.valid) {
      return { valid: false, error: result.error };
    }
  }

  return { valid: true, curriculum: c as unknown as Curriculum };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { id: projectId } = await params;

  try {
    const supabase = createServiceClient();

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    const body = await request.json();

    if (!body.curriculum) {
      return errorResponse("curriculum object is required", 400);
    }

    const validation = validateCurriculum(body.curriculum);
    if (!validation.valid) {
      return errorResponse(validation.error, 400);
    }

    const { curriculum } = validation;

    // Map tech_name → tech_stack_id
    const techNames = [...new Set(curriculum.modules.map((m) => m.tech_name))];
    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select("id, technology_name")
      .eq("project_id", projectId)
      .in("technology_name", techNames);

    const techNameToId = new Map<string, string>();
    if (techStacks) {
      for (const ts of techStacks) {
        techNameToId.set(ts.technology_name, ts.id);
      }
    }

    // Fetch user locale
    const { data: userData } = await supabase
      .from("users")
      .select("locale")
      .eq("id", authResult.userId)
      .single();
    const locale = (userData?.locale === "en" ? "en" : "ko") as "ko" | "en";

    // Compute estimated_hours from module minutes (more accurate than LLM guess)
    const totalMinutes = curriculum.modules.reduce(
      (sum, m) => sum + (m.estimated_minutes ?? 30),
      0,
    );
    const computedHours = Math.ceil(totalMinutes / 60);

    // Create learning_path
    const pathInsert: LearningPathInsert = {
      project_id: projectId,
      user_id: authResult.userId,
      title: curriculum.title,
      description: curriculum.description,
      difficulty: curriculum.difficulty as Difficulty,
      estimated_hours: computedHours,
      total_modules: curriculum.modules.length,
      status: "active",
      llm_provider: "mcp_client",
      locale,
    };

    const { data: learningPath, error: pathError } = await supabase
      .from("learning_paths")
      .insert(pathInsert)
      .select("id")
      .single();

    if (pathError || !learningPath) {
      return errorResponse("Failed to create learning path", 500);
    }

    // Create learning_modules with full content
    const now = new Date().toISOString();
    const moduleInserts: LearningModuleInsert[] = curriculum.modules.map(
      (mod, idx) => {
        const conceptKeys = Array.isArray(mod.concept_keys)
          ? mod.concept_keys.filter((k): k is string => typeof k === "string" && k.length > 0)
          : [];
        return {
          learning_path_id: learningPath.id,
          title: mod.title,
          description: mod.description,
          module_type: mod.module_type as ModuleType,
          module_order: idx + 1,
          estimated_minutes: mod.estimated_minutes ?? null,
          tech_stack_id: techNameToId.get(mod.tech_name) ?? null,
          concept_keys: conceptKeys.length > 0 ? conceptKeys : null,
          content: {
            sections: mod.content.sections,
            _meta: {
              tech_name: mod.tech_name,
              relevant_files: [],
              learning_objectives: [],
            },
            _status: "ready",
            _generated_at: now,
          } as unknown as Json,
        };
      },
    );

    const { error: modulesError } = await supabase
      .from("learning_modules")
      .insert(moduleInserts);

    if (modulesError) {
      // Rollback: delete the learning path
      await supabase.from("learning_paths").delete().eq("id", learningPath.id);
      return errorResponse("Failed to create learning modules", 500);
    }

    return successResponse(
      {
        learning_path_id: learningPath.id,
        title: curriculum.title,
        total_modules: curriculum.modules.length,
      },
      201,
    );
  } catch {
    return errorResponse("Invalid request body", 400);
  }
}

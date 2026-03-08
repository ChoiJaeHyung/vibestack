import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { validateModule } from "@/lib/utils/curriculum-validation";
import { getKBHints } from "@/lib/knowledge";
import type { Database, Json, Locale } from "@/types/database";

type ModuleType = Database["public"]["Enums"]["module_type"];
type LearningModuleInsert = Database["public"]["Tables"]["learning_modules"]["Insert"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pathId: string }> },
) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { id: projectId, pathId } = await params;

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

    // Verify learning_path exists, belongs to this project+user, and is in draft status
    const { data: learningPath, error: pathError } = await supabase
      .from("learning_paths")
      .select("id, status, difficulty, total_modules, project_id, locale")
      .eq("id", pathId)
      .eq("project_id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (pathError || !learningPath) {
      return errorResponse("Learning path not found", 404);
    }

    if (learningPath.status !== "draft") {
      return errorResponse("Learning path is not in draft status. Only draft paths accept module submissions.", 400);
    }

    const body = await request.json();

    // Validate module_order
    if (typeof body.module_order !== "number" || !Number.isInteger(body.module_order) || body.module_order < 1 || body.module_order > learningPath.total_modules) {
      return errorResponse(
        `module_order must be an integer between 1 and ${learningPath.total_modules}`,
        400,
      );
    }

    // Validate input lengths
    if (typeof body.title === "string" && body.title.length > 500) {
      return errorResponse("title must be 500 characters or less", 400);
    }
    if (typeof body.description === "string" && body.description.length > 5000) {
      return errorResponse("description must be 5000 characters or less", 400);
    }

    // Validate estimated_minutes
    if (body.estimated_minutes !== undefined && body.estimated_minutes !== null) {
      if (typeof body.estimated_minutes !== "number" || body.estimated_minutes <= 0) {
        return errorResponse("estimated_minutes must be a positive number", 400);
      }
    }

    // Validate module using shared utility
    const difficulty = learningPath.difficulty ?? "beginner";
    const moduleData = {
      title: body.title,
      description: body.description,
      module_type: body.module_type,
      tech_name: body.tech_name,
      content: body.content,
    };

    const validation = validateModule(moduleData, body.module_order - 1, difficulty);
    if (!validation.valid) {
      const allErrors = validation.errors;
      return errorResponse(
        allErrors.length > 1
          ? `${allErrors.length} validation errors:\n${allErrors.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}`
          : validation.error,
        400,
      );
    }

    // Map tech_name → tech_stack_id
    let techStackId: string | null = null;
    if (typeof body.tech_name === "string" && body.tech_name.length > 0) {
      const { data: techStack } = await supabase
        .from("tech_stacks")
        .select("id")
        .eq("project_id", projectId)
        .eq("technology_name", body.tech_name)
        .maybeSingle();

      techStackId = techStack?.id ?? null;
    }

    const now = new Date().toISOString();
    const moduleContent = {
      sections: body.content.sections,
      _meta: {
        tech_name: body.tech_name,
        relevant_files: [],
        learning_objectives: [],
      },
      _status: "ready",
      _generated_at: now,
    } as unknown as Json;

    // Extract concept_keys if provided (R6: Module→Concept coverage)
    let conceptKeys = Array.isArray(body.concept_keys)
      ? (body.concept_keys as unknown[]).filter(
          (k): k is string => typeof k === "string" && k.length > 0,
        )
      : [];

    // Smart fallback: if concept_keys empty, infer from title/description + KB
    if (conceptKeys.length === 0 && typeof body.tech_name === "string") {
      const pathLocale = (learningPath as { locale?: string }).locale as Locale | undefined;
      const kbHints = await getKBHints(body.tech_name, pathLocale ?? "ko");
      if (kbHints.length > 0) {
        const searchText = `${body.title} ${body.description}`.toLowerCase();
        conceptKeys = kbHints
          .filter((h) =>
            h.concept_key.split("-").some((word) => searchText.includes(word)) ||
            h.concept_name.toLowerCase().split(/\s+/).some((word) => word.length > 2 && searchText.includes(word)) ||
            h.tags?.some((tag) => searchText.includes(tag.toLowerCase()))
          )
          .slice(0, 3)
          .map((h) => h.concept_key);
      }
    }

    // Atomic upsert using DB unique constraint on (learning_path_id, module_order)
    const moduleUpsert: LearningModuleInsert = {
      learning_path_id: pathId,
      title: body.title,
      description: body.description,
      module_type: body.module_type as ModuleType,
      module_order: body.module_order,
      estimated_minutes: typeof body.estimated_minutes === "number" ? body.estimated_minutes : null,
      tech_stack_id: techStackId,
      concept_keys: conceptKeys.length > 0 ? conceptKeys : null,
      content: moduleContent,
    };

    const { data: upsertedModule, error: upsertError } = await supabase
      .from("learning_modules")
      .upsert(moduleUpsert, { onConflict: "learning_path_id,module_order" })
      .select("id")
      .single();

    if (upsertError || !upsertedModule) {
      return errorResponse("Failed to save module", 500);
    }
    const moduleId = upsertedModule.id;

    // Count submitted modules
    const { count: submittedCount } = await supabase
      .from("learning_modules")
      .select("id", { count: "exact", head: true })
      .eq("learning_path_id", pathId);

    const submitted = submittedCount ?? 0;
    let status = "draft";

    // Auto-activate when all modules are submitted (only if still in draft)
    if (submitted >= learningPath.total_modules) {
      // Compute estimated_hours from actual module minutes
      const { data: allModules } = await supabase
        .from("learning_modules")
        .select("estimated_minutes")
        .eq("learning_path_id", pathId);

      const totalMinutes = (allModules ?? []).reduce(
        (sum, m) => sum + (m.estimated_minutes ?? 30),
        0,
      );
      const computedHours = Math.ceil(totalMinutes / 60);

      const { data: activated, error: activateError } = await supabase
        .from("learning_paths")
        .update({ status: "active", estimated_hours: computedHours })
        .eq("id", pathId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

      if (!activateError && activated) {
        status = "active";
      }
    }

    return successResponse(
      {
        module_id: moduleId,
        module_order: body.module_order,
        submitted,
        total: learningPath.total_modules,
        status,
      },
      201,
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid request body", 400);
    }
    return errorResponse("Internal server error", 500);
  }
}

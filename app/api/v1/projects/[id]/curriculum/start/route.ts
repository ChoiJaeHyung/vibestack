import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { VALID_DIFFICULTIES } from "@/lib/utils/curriculum-validation";
import type { Database } from "@/types/database";

type Difficulty = Database["public"]["Enums"]["difficulty"];
type LearningPathInsert = Database["public"]["Tables"]["learning_paths"]["Insert"];

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

    // Validate input
    if (typeof body.title !== "string" || body.title.length === 0) {
      return errorResponse("title is required", 400);
    }
    if (body.title.length > 500) {
      return errorResponse("title must be 500 characters or less", 400);
    }
    if (typeof body.description !== "string" || body.description.length === 0) {
      return errorResponse("description is required", 400);
    }
    if (body.description.length > 5000) {
      return errorResponse("description must be 5000 characters or less", 400);
    }
    if (!VALID_DIFFICULTIES.includes(body.difficulty)) {
      return errorResponse(`difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}`, 400);
    }
    if (typeof body.total_modules !== "number" || !Number.isInteger(body.total_modules) || body.total_modules < 1 || body.total_modules > 50) {
      return errorResponse("total_modules must be an integer between 1 and 50", 400);
    }
    if (body.estimated_hours !== undefined && body.estimated_hours !== null) {
      if (typeof body.estimated_hours !== "number" || body.estimated_hours <= 0) {
        return errorResponse("estimated_hours must be a positive number", 400);
      }
    }

    // Clean up existing paths for this project (retry-safe)
    // 1. Delete draft paths unconditionally
    const { data: draftPaths } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", authResult.userId)
      .eq("status", "draft");

    if (draftPaths && draftPaths.length > 0) {
      const draftIds = draftPaths.map((p) => p.id);
      const { error: delModErr } = await supabase
        .from("learning_modules")
        .delete()
        .in("learning_path_id", draftIds);
      if (delModErr) {
        console.warn("Failed to delete draft modules:", delModErr.message);
      }
      const { error: delPathErr } = await supabase
        .from("learning_paths")
        .delete()
        .in("id", draftIds);
      if (delPathErr) {
        console.warn("Failed to delete draft paths:", delPathErr.message);
      }
    }

    // 2. Archive active paths that have learning progress; delete those without
    const { data: activePaths } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", authResult.userId)
      .eq("status", "active");

    if (activePaths && activePaths.length > 0) {
      for (const ap of activePaths) {
        const { count: progressCount } = await supabase
          .from("learning_progress")
          .select("id", { count: "exact", head: true })
          .eq("learning_path_id", ap.id);

        if (progressCount && progressCount > 0) {
          // Has progress — archive instead of deleting
          const { error: archiveErr } = await supabase
            .from("learning_paths")
            .update({ status: "archived" })
            .eq("id", ap.id);
          if (archiveErr) {
            console.warn("Failed to archive active path:", archiveErr.message);
          }
        } else {
          // No progress — safe to delete
          const { error: delModErr } = await supabase
            .from("learning_modules")
            .delete()
            .eq("learning_path_id", ap.id);
          if (delModErr) {
            console.warn("Failed to delete active path modules:", delModErr.message);
          }
          const { error: delPathErr } = await supabase
            .from("learning_paths")
            .delete()
            .eq("id", ap.id);
          if (delPathErr) {
            console.warn("Failed to delete active path:", delPathErr.message);
          }
        }
      }
    }

    // Fetch user locale
    const { data: userData } = await supabase
      .from("users")
      .select("locale")
      .eq("id", authResult.userId)
      .single();
    const locale = (userData?.locale === "en" ? "en" : "ko") as "ko" | "en";

    // Create draft learning_path
    const pathInsert: LearningPathInsert = {
      project_id: projectId,
      user_id: authResult.userId,
      title: body.title,
      description: body.description,
      difficulty: body.difficulty as Difficulty,
      estimated_hours: typeof body.estimated_hours === "number" ? body.estimated_hours : null,
      total_modules: body.total_modules,
      status: "draft",
      llm_provider: "mcp_client",
      locale,
    };

    const { data: learningPath, error: pathError } = await supabase
      .from("learning_paths")
      .insert(pathInsert)
      .select("id, status")
      .single();

    if (pathError || !learningPath) {
      return errorResponse("Failed to create learning path", 500);
    }

    // Defensive: if concurrent requests created duplicate drafts, keep only ours
    const { data: allDrafts } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", authResult.userId)
      .eq("status", "draft")
      .order("created_at", { ascending: false });

    if (allDrafts && allDrafts.length > 1) {
      const duplicateIds = allDrafts
        .filter((d) => d.id !== learningPath.id)
        .map((d) => d.id);
      await supabase
        .from("learning_modules")
        .delete()
        .in("learning_path_id", duplicateIds);
      await supabase
        .from("learning_paths")
        .delete()
        .in("id", duplicateIds);
    }

    return successResponse(
      {
        learning_path_id: learningPath.id,
        status: learningPath.status,
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

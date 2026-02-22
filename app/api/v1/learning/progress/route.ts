import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

type ProgressStatus = Database["public"]["Enums"]["progress_status"];
type LearningProgressInsert = Database["public"]["Tables"]["learning_progress"]["Insert"];
type LearningProgressUpdate = Database["public"]["Tables"]["learning_progress"]["Update"];

interface ProgressRequestBody {
  module_id: string;
  status: "in_progress" | "completed" | "skipped";
  score?: number;
  time_spent?: number;
}

const VALID_PROGRESS_STATUSES = new Set<ProgressStatus>([
  "in_progress",
  "completed",
  "skipped",
]);

export async function POST(request: NextRequest) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const body = (await request.json()) as ProgressRequestBody;

    if (!body.module_id) {
      return errorResponse("module_id is required", 400);
    }

    if (!body.status || !VALID_PROGRESS_STATUSES.has(body.status)) {
      return errorResponse(
        "status must be one of: in_progress, completed, skipped",
        400,
      );
    }

    const supabase = createServiceClient();

    // Verify the module exists and user owns the learning path
    const { data: moduleData, error: moduleError } = await supabase
      .from("learning_modules")
      .select("id, learning_path_id")
      .eq("id", body.module_id)
      .single();

    if (moduleError || !moduleData) {
      return errorResponse("Module not found", 404);
    }

    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", moduleData.learning_path_id)
      .eq("user_id", authResult.userId)
      .single();

    if (pathError || !path) {
      return errorResponse("Learning path not found", 404);
    }

    // Check for existing progress
    const { data: existing } = await supabase
      .from("learning_progress")
      .select("id, attempts")
      .eq("module_id", body.module_id)
      .eq("user_id", authResult.userId)
      .single();

    if (existing) {
      const progressUpdate: LearningProgressUpdate = {
        status: body.status,
        score: body.score ?? null,
        time_spent: body.time_spent ?? null,
        attempts: existing.attempts + 1,
        completed_at:
          body.status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("learning_progress")
        .update(progressUpdate)
        .eq("id", existing.id);

      if (updateError) {
        return errorResponse("Failed to update progress", 500);
      }
    } else {
      const progressInsert: LearningProgressInsert = {
        user_id: authResult.userId,
        module_id: body.module_id,
        status: body.status,
        score: body.score ?? null,
        time_spent: body.time_spent ?? null,
        attempts: 1,
        completed_at:
          body.status === "completed" ? new Date().toISOString() : null,
      };

      const { error: insertError } = await supabase
        .from("learning_progress")
        .insert(progressInsert);

      if (insertError) {
        return errorResponse("Failed to create progress record", 500);
      }
    }

    return successResponse({ updated: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

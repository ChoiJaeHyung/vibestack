import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

interface LearningPathItem {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  estimated_hours: number | null;
  total_modules: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return errorResponse("project_id query parameter is required", 400);
    }

    const supabase = createServiceClient();

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    const { data, error } = await supabase
      .from("learning_paths")
      .select(
        "id, title, description, difficulty, estimated_hours, total_modules, status, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .eq("user_id", authResult.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return errorResponse("Failed to fetch learning paths", 500);
    }

    return successResponse<LearningPathItem[]>(
      (data ?? []) as LearningPathItem[],
    );
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

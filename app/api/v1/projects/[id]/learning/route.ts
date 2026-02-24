import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

interface LearningPathResponse {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  total_modules: number;
  status: string;
  created_at: string;
  modules: LearningModuleResponse[];
}

interface LearningModuleResponse {
  id: string;
  title: string;
  description: string | null;
  module_order: number;
  estimated_minutes: number | null;
  topics: string[];
}

function extractTopics(content: Json): string[] {
  if (
    content &&
    typeof content === "object" &&
    !Array.isArray(content) &&
    "topics" in content &&
    Array.isArray(content.topics)
  ) {
    return content.topics.filter(
      (t: unknown): t is string => typeof t === "string",
    );
  }
  return [];
}

export async function GET(
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
      .select("id")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    // Fetch latest learning path
    const { data: learningPath, error: pathError } = await supabase
      .from("learning_paths")
      .select("id, title, description, difficulty, total_modules, status, created_at")
      .eq("project_id", projectId)
      .eq("user_id", authResult.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (pathError || !learningPath) {
      return errorResponse(
        "No learning path found for this project. Run analysis first.",
        404,
      );
    }

    // Fetch modules for this learning path
    const { data: modules } = await supabase
      .from("learning_modules")
      .select("id, title, description, module_order, estimated_minutes, content")
      .eq("learning_path_id", learningPath.id)
      .order("module_order", { ascending: true });

    return successResponse<LearningPathResponse>({
      id: learningPath.id,
      title: learningPath.title,
      description: learningPath.description ?? null,
      difficulty: learningPath.difficulty ?? null,
      total_modules: learningPath.total_modules,
      status: learningPath.status,
      created_at: learningPath.created_at,
      modules: (modules ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description ?? null,
        module_order: m.module_order,
        estimated_minutes: m.estimated_minutes ?? null,
        topics: extractTopics(m.content),
      })),
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

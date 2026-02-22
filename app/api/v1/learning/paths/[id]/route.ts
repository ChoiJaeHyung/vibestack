import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

interface ModuleItem {
  id: string;
  title: string;
  description: string | null;
  module_type: string | null;
  module_order: number;
  estimated_minutes: number | null;
  tech_stack_id: string | null;
}

interface LearningPathDetailResponse {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  estimated_hours: number | null;
  total_modules: number;
  status: string;
  llm_provider: string | null;
  created_at: string;
  updated_at: string;
  modules: ModuleItem[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { id: pathId } = await params;

  try {
    const supabase = createServiceClient();

    // Fetch learning path
    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select(
        "id, title, description, difficulty, estimated_hours, total_modules, status, llm_provider, created_at, updated_at",
      )
      .eq("id", pathId)
      .eq("user_id", authResult.userId)
      .single();

    if (pathError || !path) {
      return errorResponse("Learning path not found", 404);
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
      return errorResponse("Failed to fetch modules", 500);
    }

    const response: LearningPathDetailResponse = {
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
      modules: (modules ?? []) as ModuleItem[],
    };

    return successResponse<LearningPathDetailResponse>(response);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

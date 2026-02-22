import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

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

interface ModuleDetailResponse {
  id: string;
  title: string;
  description: string | null;
  module_type: string | null;
  module_order: number;
  estimated_minutes: number | null;
  tech_stack_id: string | null;
  content: ModuleContent;
  learning_path_id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { id: moduleId } = await params;

  try {
    const supabase = createServiceClient();

    // Fetch module
    const { data: moduleData, error: moduleError } = await supabase
      .from("learning_modules")
      .select(
        "id, title, description, module_type, module_order, estimated_minutes, tech_stack_id, content, learning_path_id",
      )
      .eq("id", moduleId)
      .single();

    if (moduleError || !moduleData) {
      return errorResponse("Module not found", 404);
    }

    // Verify user owns the learning path
    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", moduleData.learning_path_id)
      .eq("user_id", authResult.userId)
      .single();

    if (pathError || !path) {
      return errorResponse("Learning path not found", 404);
    }

    const response: ModuleDetailResponse = {
      id: moduleData.id,
      title: moduleData.title,
      description: moduleData.description,
      module_type: moduleData.module_type,
      module_order: moduleData.module_order,
      estimated_minutes: moduleData.estimated_minutes,
      tech_stack_id: moduleData.tech_stack_id,
      content: moduleData.content as unknown as ModuleContent,
      learning_path_id: moduleData.learning_path_id,
    };

    return successResponse<ModuleDetailResponse>(response);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

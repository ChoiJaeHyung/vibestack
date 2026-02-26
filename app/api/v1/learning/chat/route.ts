import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { executeTutorChat } from "@/server/actions/tutor-chat";

interface ChatRequestBody {
  project_id: string;
  message: string;
  conversation_id?: string;
  learning_path_id?: string;
}

interface ChatResponseData {
  conversation_id: string;
  response: string;
  tokens_used: number;
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const body = (await request.json()) as ChatRequestBody;

    if (!body.project_id) {
      return errorResponse("project_id is required", 400);
    }

    if (!body.message || body.message.trim().length === 0) {
      return errorResponse("message is required", 400);
    }

    const supabase = createServiceClient();

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    const result = await executeTutorChat({
      userId: authResult.userId,
      projectId: body.project_id,
      message: body.message,
      conversationId: body.conversation_id,
      learningPathId: body.learning_path_id,
    });

    return successResponse<ChatResponseData>({
      conversation_id: result.conversationId,
      response: result.response,
      tokens_used: result.tokensUsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message.includes("Usage limit")) {
      return errorResponse(message, 403);
    }
    if (message.includes("LLM API") && !message.includes("서버 설정")) {
      return errorResponse(message, 400);
    }

    return errorResponse("Internal server error", 500);
  }
}

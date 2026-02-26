import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { executeTutorChat } from "@/server/actions/tutor-chat";

interface TutorRequestBody {
  question: string;
  conversation_id?: string;
}

interface TutorResponse {
  answer: string;
  conversation_id: string;
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
    const body = (await request.json()) as TutorRequestBody;

    if (!body.question || body.question.trim().length === 0) {
      return errorResponse("question is required", 400);
    }

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

    const result = await executeTutorChat({
      userId: authResult.userId,
      projectId,
      message: body.question,
      conversationId: body.conversation_id,
    });

    return successResponse<TutorResponse>({
      answer: result.response,
      conversation_id: result.conversationId,
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

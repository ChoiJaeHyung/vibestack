import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ConversationDetailResponse {
  id: string;
  title: string | null;
  context_type: string | null;
  total_tokens: number;
  learning_path_id: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { conversationId } = await params;

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("ai_conversations")
      .select(
        "id, title, context_type, total_tokens, learning_path_id, messages, created_at, updated_at",
      )
      .eq("id", conversationId)
      .eq("user_id", authResult.userId)
      .single();

    if (error || !data) {
      return errorResponse("Conversation not found", 404);
    }

    const response: ConversationDetailResponse = {
      id: data.id,
      title: data.title,
      context_type: data.context_type,
      total_tokens: data.total_tokens,
      learning_path_id: data.learning_path_id,
      messages: data.messages as unknown as ChatMessage[],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return successResponse<ConversationDetailResponse>(response);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

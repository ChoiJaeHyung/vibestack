import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyForUser } from "@/server/actions/llm-keys";
import { checkUsageLimit } from "@/lib/utils/usage-limits";
import { buildTutorPrompt } from "@/lib/prompts/tutor-chat";
import type { Json } from "@/types/database";

interface ChatRequestBody {
  project_id: string;
  message: string;
  conversation_id?: string;
  learning_path_id?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
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

    // Check usage limit for new conversations
    if (!body.conversation_id) {
      const usageCheck = await checkUsageLimit(authResult.userId, "chat");
      if (!usageCheck.allowed) {
        return errorResponse(
          usageCheck.upgrade_message ?? "Usage limit reached",
          403,
        );
      }
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

    // Load project files and tech stacks
    const { data: projectFiles } = await supabase
      .from("project_files")
      .select("file_name, raw_content")
      .eq("project_id", body.project_id)
      .not("raw_content", "is", null)
      .limit(10);

    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select("technology_name, category, description")
      .eq("project_id", body.project_id);

    // Build learning context
    let learningContext:
      | { path_title: string; current_module: string }
      | undefined;

    if (body.learning_path_id) {
      const { data: pathData } = await supabase
        .from("learning_paths")
        .select("title")
        .eq("id", body.learning_path_id)
        .eq("user_id", authResult.userId)
        .single();

      if (pathData) {
        const { data: modules } = await supabase
          .from("learning_modules")
          .select("id, title")
          .eq("learning_path_id", body.learning_path_id)
          .order("module_order", { ascending: true })
          .limit(1);

        learningContext = {
          path_title: pathData.title,
          current_module: modules?.[0]?.title ?? "Getting started",
        };
      }
    }

    // Build system prompt
    const systemPrompt = buildTutorPrompt(
      (techStacks ?? []).map((t) => ({
        technology_name: t.technology_name,
        category: t.category,
        description: t.description,
      })),
      (projectFiles ?? [])
        .filter(
          (f): f is { file_name: string; raw_content: string } =>
            f.raw_content !== null,
        )
        .map((f) => ({
          file_name: f.file_name,
          raw_content: f.raw_content,
        })),
      learningContext,
    );

    // Load existing conversation history
    let existingMessages: ChatMessage[] = [];
    let conversationId: string | null = body.conversation_id ?? null;

    if (conversationId) {
      const { data: conversationData } = await supabase
        .from("ai_conversations")
        .select("messages")
        .eq("id", conversationId)
        .eq("user_id", authResult.userId)
        .single();

      if (conversationData) {
        existingMessages =
          conversationData.messages as unknown as ChatMessage[];
      }
    }

    // Assemble messages
    const allMessages: ChatMessage[] = [
      { role: "system" as const, content: systemPrompt },
      ...existingMessages.filter((m) => m.role !== "system"),
      { role: "user" as const, content: body.message },
    ];

    // Get LLM key and create provider
    const llmKeyData = await getDefaultLlmKeyForUser(authResult.userId);
    if (!llmKeyData) {
      return errorResponse(
        "No LLM API key configured. Please add an API key in settings.",
        400,
      );
    }

    const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);
    const chatResult = await provider.chat({ messages: allMessages });

    const totalTokens = chatResult.input_tokens + chatResult.output_tokens;

    // Store messages
    const updatedMessages: ChatMessage[] = [
      ...existingMessages.filter((m) => m.role !== "system"),
      { role: "user" as const, content: body.message },
      { role: "assistant" as const, content: chatResult.content },
    ];

    if (conversationId) {
      const { error: updateError } = await supabase
        .from("ai_conversations")
        .update({
          messages: updatedMessages as unknown as Json,
          total_tokens: totalTokens,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (updateError) {
        return errorResponse("Failed to update conversation history", 500);
      }
    } else {
      const conversationTitle =
        body.message.length > 80
          ? body.message.slice(0, 80) + "..."
          : body.message;

      const { data: newConversation, error: insertError } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: authResult.userId,
          project_id: body.project_id,
          learning_path_id: body.learning_path_id ?? null,
          title: conversationTitle,
          messages: updatedMessages as unknown as Json,
          context_type: body.learning_path_id ? "learning" : "general",
          llm_provider: provider.providerName,
          total_tokens: totalTokens,
        })
        .select("id")
        .single();

      if (insertError || !newConversation) {
        return errorResponse("Failed to create conversation", 500);
      }

      conversationId = newConversation.id;
    }

    return successResponse<ChatResponseData>({
      conversation_id: conversationId,
      response: chatResult.content,
      tokens_used: totalTokens,
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

import { createServiceClient } from "@/lib/supabase/service";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { llmKeyErrorMessage } from "@/lib/utils/llm-key-errors";
import { checkUsageLimit } from "@/lib/utils/usage-limits";
import { buildTutorPrompt } from "@/lib/prompts/tutor-chat";
import { decryptContent } from "@/lib/utils/content-encryption";
import type { Json } from "@/types/database";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ExecuteTutorChatInput {
  userId: string;
  projectId: string;
  message: string;
  conversationId?: string;
  learningPathId?: string;
}

interface ExecuteTutorChatResult {
  conversationId: string;
  response: string;
  tokensUsed: number;
}

export async function executeTutorChat(
  input: ExecuteTutorChatInput,
): Promise<ExecuteTutorChatResult> {
  const { userId, projectId, message, conversationId: existingConversationId, learningPathId } = input;

  // Check usage limit for new conversations
  if (!existingConversationId) {
    const usageCheck = await checkUsageLimit(userId, "chat");
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.upgrade_message ?? "Usage limit reached");
    }
  }

  const supabase = createServiceClient();

  // Load project files and tech stacks
  const { data: projectFiles } = await supabase
    .from("project_files")
    .select("file_name, raw_content")
    .eq("project_id", projectId)
    .not("raw_content", "is", null)
    .limit(10);

  const { data: techStacks } = await supabase
    .from("tech_stacks")
    .select("technology_name, category, description")
    .eq("project_id", projectId);

  // Build learning context
  let learningContext:
    | { path_title: string; current_module: string }
    | undefined;

  if (learningPathId) {
    const { data: pathData } = await supabase
      .from("learning_paths")
      .select("title")
      .eq("id", learningPathId)
      .eq("user_id", userId)
      .single();

    if (pathData) {
      const { data: modules } = await supabase
        .from("learning_modules")
        .select("id, title")
        .eq("learning_path_id", learningPathId)
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
        raw_content: decryptContent(f.raw_content),
      })),
    learningContext,
  );

  // Load existing conversation history
  let existingMessages: ChatMessage[] = [];
  let conversationId: string | null = existingConversationId ?? null;

  if (conversationId) {
    const { data: conversationData } = await supabase
      .from("ai_conversations")
      .select("messages")
      .eq("id", conversationId)
      .eq("user_id", userId)
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
    { role: "user" as const, content: message },
  ];

  // Get LLM key and create provider
  const llmKeyResult = await getDefaultLlmKeyWithDiagnosis(userId);
  if (!llmKeyResult.data) {
    throw new Error(llmKeyErrorMessage(llmKeyResult.error));
  }
  const llmKeyData = llmKeyResult.data;

  const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);
  const chatResult = await provider.chat({ messages: allMessages });

  const totalTokens = chatResult.input_tokens + chatResult.output_tokens;

  // Store messages
  const updatedMessages: ChatMessage[] = [
    ...existingMessages.filter((m) => m.role !== "system"),
    { role: "user" as const, content: message },
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
      throw new Error("Failed to update conversation history");
    }
  } else {
    const conversationTitle =
      message.length > 80
        ? message.slice(0, 80) + "..."
        : message;

    const { data: newConversation, error: insertError } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: userId,
        project_id: projectId,
        learning_path_id: learningPathId ?? null,
        title: conversationTitle,
        messages: updatedMessages as unknown as Json,
        context_type: learningPathId ? "learning" : "general",
        llm_provider: provider.providerName,
        total_tokens: totalTokens,
      })
      .select("id")
      .single();

    if (insertError || !newConversation) {
      throw new Error("Failed to create conversation");
    }

    conversationId = newConversation.id;
  }

  return {
    conversationId,
    response: chatResult.content,
    tokensUsed: totalTokens,
  };
}

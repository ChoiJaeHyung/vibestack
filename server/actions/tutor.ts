"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createLLMProvider } from "@/lib/llm/factory";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { llmKeyErrorMessage } from "@/lib/utils/llm-key-errors";
import { checkUsageLimit } from "@/lib/utils/usage-limits";
import { buildTutorPrompt } from "@/lib/prompts/tutor-chat";
import { decryptContent } from "@/lib/utils/content-encryption";
import { rateLimit } from "@/lib/utils/rate-limit";
import { getUserLocale } from "@/server/actions/learning-utils";
import type { Json } from "@/types/database";

// ─── System Prompt Cache ─────────────────────────────────────────────
// Caches the static portion of the system prompt per conversation.
// Saves 5+ DB queries on subsequent messages in the same conversation.

interface CachedPrompt {
  staticPrompt: string;
  moduleId: string | undefined;
  createdAt: number;
}

const PROMPT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const promptCache = new Map<string, CachedPrompt>();

function getCachedStaticPrompt(conversationId: string, moduleId?: string): string | null {
  const cached = promptCache.get(conversationId);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > PROMPT_CACHE_TTL) {
    promptCache.delete(conversationId);
    return null;
  }
  // Invalidate if module changed (different learning context)
  if (cached.moduleId !== moduleId) {
    promptCache.delete(conversationId);
    return null;
  }
  return cached.staticPrompt;
}

function setCachedStaticPrompt(conversationId: string, staticPrompt: string, moduleId?: string): void {
  // Evict oldest entries if cache grows too large (prevent memory leak)
  if (promptCache.size > 500) {
    const oldest = promptCache.entries().next().value;
    if (oldest) promptCache.delete(oldest[0]);
  }
  promptCache.set(conversationId, { staticPrompt, moduleId, createdAt: Date.now() });
}

// ─── Response Types ──────────────────────────────────────────────────

interface SendTutorMessageResult {
  success: boolean;
  data?: {
    conversation_id: string;
    response: string;
    tokens_used: number;
  };
  error?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatHistoryResult {
  success: boolean;
  data?: ChatMessage[];
  error?: string;
}

interface ConversationItem {
  id: string;
  title: string | null;
  context_type: string | null;
  total_tokens: number;
  learning_path_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ConversationListResult {
  success: boolean;
  data?: ConversationItem[];
  error?: string;
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function sendTutorMessage(
  projectId: string,
  message: string,
  conversationId?: string,
  learningPathId?: string,
  moduleId?: string,
): Promise<SendTutorMessageResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Rate limit: 20 tutor messages per minute per user
    const rl = rateLimit(`tutor:${user.id}`, 20);
    if (!rl.success) {
      return { success: false, error: "Too many messages. Please try again later." };
    }

    // Check usage limit for new conversations
    if (!conversationId) {
      const usageCheck = await checkUsageLimit(user.id, "chat");
      if (!usageCheck.allowed) {
        return {
          success: false,
          error: usageCheck.upgrade_message ?? "Usage limit reached",
        };
      }
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    // ── Build system prompt (with caching) ────────────────────────────
    let staticPrompt: string;
    const cachedStatic = conversationId
      ? getCachedStaticPrompt(conversationId, moduleId)
      : null;

    if (cachedStatic) {
      // Cache hit: skip 5 DB queries (files, techStacks, path, module, locale)
      staticPrompt = cachedStatic;
    } else {
      // Cache miss: fetch all context in parallel
      const [filesResult, techResult, localeResult, pathAndModuleResult] = await Promise.all([
        supabase
          .from("project_files")
          .select("file_name, raw_content")
          .eq("project_id", projectId)
          .not("raw_content", "is", null)
          .limit(5),
        supabase
          .from("tech_stacks")
          .select("technology_name, category, description")
          .eq("project_id", projectId),
        getUserLocale(user.id),
        buildLearningContext(supabase, user.id, learningPathId, moduleId),
      ]);

      const projectFiles = filesResult.data ?? [];
      const techStacks = techResult.data ?? [];
      const tutorLocale = localeResult;
      const learningContext = pathAndModuleResult;

      staticPrompt = buildTutorPrompt(
        techStacks.map((t) => ({
          technology_name: t.technology_name,
          category: t.category,
          description: t.description,
        })),
        projectFiles
          .filter(
            (f): f is { file_name: string; raw_content: string } =>
              f.raw_content !== null,
          )
          .map((f) => ({
            file_name: f.file_name,
            raw_content: decryptContent(f.raw_content),
          })),
        learningContext ?? undefined,
        tutorLocale,
      );
    }

    // ── Fetch learner profile + conversation history in parallel ─────
    const [learnerProfile, existingMessagesResult] = await Promise.all([
      learningPathId
        ? fetchLearnerProfileData(supabase, user.id, learningPathId)
        : Promise.resolve(null),
      conversationId
        ? supabase
            .from("ai_conversations")
            .select("messages")
            .eq("id", conversationId)
            .eq("user_id", user.id)
            .single()
        : Promise.resolve(null),
    ]);

    let existingMessages: ChatMessage[] = [];
    let existingConversationId: string | null = conversationId ?? null;

    if (existingMessagesResult && "data" in existingMessagesResult && existingMessagesResult.data) {
      existingMessages = existingMessagesResult.data.messages as unknown as ChatMessage[];
    }

    // Combine static prompt + dynamic learner profile
    const systemPrompt = learnerProfile
      ? `${staticPrompt}\n\n${formatLearnerProfileData(learnerProfile)}`
      : staticPrompt;

    // Cache the static portion for subsequent messages
    if (existingConversationId && !cachedStatic) {
      setCachedStaticPrompt(existingConversationId, staticPrompt, moduleId);
    }

    // Assemble messages array
    const allMessages: ChatMessage[] = [
      { role: "system" as const, content: systemPrompt },
      ...existingMessages.filter((m) => m.role !== "system"),
      { role: "user" as const, content: message },
    ];

    // Get user's default LLM key
    const llmKeyResult = await getDefaultLlmKeyWithDiagnosis(user.id);
    if (!llmKeyResult.data) {
      return {
        success: false,
        error: llmKeyErrorMessage(llmKeyResult.error),
      };
    }
    const llmKeyData = llmKeyResult.data;

    // Create LLM provider and call chat
    const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);
    const chatResult = await provider.chat({
      messages: allMessages,
    });

    const totalTokens = chatResult.input_tokens + chatResult.output_tokens;

    // Store the new messages (user + assistant) in the conversation
    const updatedMessages: ChatMessage[] = [
      ...existingMessages.filter((m) => m.role !== "system"),
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: chatResult.content },
    ];

    const serviceClient = createServiceClient();

    if (existingConversationId) {
      // Update existing conversation
      const { error: updateError } = await serviceClient
        .from("ai_conversations")
        .update({
          messages: updatedMessages as unknown as Json,
          total_tokens: totalTokens,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConversationId);

      if (updateError) {
        return {
          success: false,
          error: "Failed to update conversation history",
        };
      }
    } else {
      // Create new conversation
      const conversationTitle =
        message.length > 80 ? message.slice(0, 80) + "..." : message;

      const { data: newConversation, error: insertError } = await serviceClient
        .from("ai_conversations")
        .insert({
          user_id: user.id,
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
        return {
          success: false,
          error: "Failed to create conversation",
        };
      }

      existingConversationId = newConversation.id;

      // Cache for the newly created conversation
      setCachedStaticPrompt(existingConversationId, staticPrompt, moduleId);
    }

    return {
      success: true,
      data: {
        conversation_id: existingConversationId,
        response: chatResult.content,
        tokens_used: totalTokens,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: errorMessage };
  }
}

// ─── Helper: Build learning context from path + module ──────────────

interface LearningContextData {
  path_title: string;
  current_module: string;
  module_sections?: string;
  module_content_summary?: string;
}

async function buildLearningContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  learningPathId?: string,
  moduleId?: string,
): Promise<LearningContextData | null> {
  if (!learningPathId) return null;

  const { data: pathData } = await supabase
    .from("learning_paths")
    .select("title")
    .eq("id", learningPathId)
    .eq("user_id", userId)
    .single();

  if (!pathData) return null;

  let currentModuleTitle = "Getting started";
  let moduleSections: string | undefined;
  let moduleContentSummary: string | undefined;

  if (moduleId) {
    const { data: moduleData } = await supabase
      .from("learning_modules")
      .select("title, content")
      .eq("id", moduleId)
      .eq("learning_path_id", learningPathId)
      .single();

    if (moduleData) {
      currentModuleTitle = moduleData.title;
      const content = moduleData.content as Record<string, unknown> | null;
      if (content && Array.isArray((content as { sections?: unknown[] }).sections)) {
        const sections = (content as { sections: Array<{ title?: string; type?: string; body?: string; code?: string; quiz_options?: string[]; quiz_answer?: number }> }).sections;
        moduleSections = sections
          .map((s) => `- [${s.type ?? "section"}] ${s.title ?? "Untitled"}`)
          .join("\n");

        const contentParts: string[] = [];
        let totalLen = 0;
        const CONTENT_LIMIT = 6000;

        for (const s of sections) {
          if (totalLen >= CONTENT_LIMIT) break;
          const parts: string[] = [];
          parts.push(`[${s.type ?? "section"}] ${s.title ?? "Untitled"}`);
          if (s.body) parts.push(s.body);
          if (s.code) parts.push(`\`\`\`\n${s.code}\n\`\`\``);
          if (s.quiz_options && s.quiz_answer !== undefined) {
            parts.push(`Quiz options: ${s.quiz_options.map((o, i) => `${i === s.quiz_answer ? "✓" : " "} ${String.fromCharCode(65 + i)}. ${o}`).join(" | ")}`);
          }
          const sectionText = parts.join("\n");
          const remaining = CONTENT_LIMIT - totalLen;
          const truncated = sectionText.slice(0, remaining);
          contentParts.push(truncated);
          totalLen += truncated.length;
        }

        moduleContentSummary = contentParts.join("\n\n---\n\n");
      }
    }
  } else {
    const { data: modules } = await supabase
      .from("learning_modules")
      .select("id, title")
      .eq("learning_path_id", learningPathId)
      .order("module_order", { ascending: true })
      .limit(1);

    currentModuleTitle = modules?.[0]?.title ?? "Getting started";
  }

  return {
    path_title: pathData.title,
    current_module: currentModuleTitle,
    module_sections: moduleSections,
    module_content_summary: moduleContentSummary,
  };
}

// ─── Helper: Fetch learner profile (quiz scores, progress, streak) ──

interface LearnerProfileData {
  completedModules: number;
  totalModules: number;
  currentStreak: number;
  moduleScores: Array<{ title: string; score: number }>;
}

async function fetchLearnerProfileData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  learningPathId: string,
): Promise<LearnerProfileData | null> {
  const [modulesResult, streakResult] = await Promise.all([
    supabase
      .from("learning_modules")
      .select("id, title, module_order")
      .eq("learning_path_id", learningPathId)
      .order("module_order", { ascending: true }),
    supabase
      .from("user_streaks")
      .select("current_streak")
      .eq("user_id", userId)
      .single(),
  ]);

  const modules = modulesResult.data ?? [];
  if (modules.length === 0) return null;

  const moduleIds = modules.map((m) => m.id);
  const { data: progressData } = await supabase
    .from("learning_progress")
    .select("module_id, status, score")
    .eq("user_id", userId)
    .in("module_id", moduleIds);

  const progressMap = new Map(
    (progressData ?? []).map((p) => [p.module_id, p]),
  );

  const completedModules = (progressData ?? []).filter((p) => p.status === "completed").length;
  const moduleScores: Array<{ title: string; score: number }> = [];

  for (const m of modules) {
    const prog = progressMap.get(m.id);
    if (prog?.status === "completed" && prog.score !== null) {
      moduleScores.push({ title: m.title, score: prog.score });
    }
  }

  return {
    completedModules,
    totalModules: modules.length,
    currentStreak: streakResult.data?.current_streak ?? 0,
    moduleScores,
  };
}

// ─── Helper: Format learner profile for system prompt ───────────────

function formatLearnerProfileData(profile: LearnerProfileData): string {
  const progressPct = profile.totalModules > 0
    ? Math.round((profile.completedModules / profile.totalModules) * 100)
    : 0;

  const lines: string[] = [
    "## Student Learning Profile",
    "",
    `- Progress: ${profile.completedModules}/${profile.totalModules} modules completed (${progressPct}%)`,
    `- Current streak: ${profile.currentStreak} days`,
  ];

  if (profile.moduleScores.length > 0) {
    lines.push("- Quiz scores:");
    // Show last 5 completed modules' scores
    const recentScores = profile.moduleScores.slice(-5);
    for (const ms of recentScores) {
      const indicator = ms.score >= 80 ? "" : " ← needs review";
      lines.push(`  - "${ms.title}": ${ms.score}/100${indicator}`);
    }

    // Identify weak areas (score < 80)
    const weakModules = profile.moduleScores.filter((ms) => ms.score < 80);
    if (weakModules.length > 0) {
      lines.push(`- Weak areas: ${weakModules.map((m) => m.title).join(", ")}`);
      lines.push("");
      lines.push("When the student asks about topics related to their weak areas, provide extra detail and check their understanding.");
    }
  }

  return lines.join("\n");
}

export async function getChatHistory(
  conversationId: string,
): Promise<ChatHistoryResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .select("messages")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return { success: false, error: "Conversation not found" };
    }

    return {
      success: true,
      data: data.messages as unknown as ChatMessage[],
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function listConversations(
  projectId: string,
): Promise<ConversationListResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .select(
        "id, title, context_type, total_tokens, learning_path_id, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch conversations" };
    }

    return { success: true, data: (data ?? []) as ConversationItem[] };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

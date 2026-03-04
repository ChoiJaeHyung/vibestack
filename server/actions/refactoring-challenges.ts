"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createLLMProvider } from "@/lib/llm/factory";
import {
  getDefaultLlmKeyForUser,
} from "@/server/actions/llm-keys";
import { checkUsageLimit } from "@/lib/utils/usage-limits";
import { getSystemSetting } from "@/lib/utils/system-settings";
import { awardPoints } from "@/server/actions/points";
import { POINT_AWARDS } from "@/server/actions/point-constants";
import {
  buildChallengeGenerationPrompt,
  buildChallengeEvaluationPrompt,
} from "@/lib/prompts/challenge-generation";
import type { ImprovementItem } from "@/lib/analysis/health-scorer";
import type { Json, Locale } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────

type Difficulty = "beginner" | "intermediate" | "advanced";
type ChallengeStatus = "pending" | "in_progress" | "submitted" | "completed" | "skipped";

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ChallengeItem {
  id: string;
  projectId: string;
  missionTextKo: string;
  missionTextEn: string;
  originalCode: string;
  difficulty: Difficulty;
  status: ChallengeStatus;
  score: number | null;
  hints: Array<{ level: number; text_ko: string; text_en: string }>;
  createdAt: string;
  completedAt: string | null;
}

interface GeneratedChallenge {
  mission_text_ko: string;
  mission_text_en: string;
  hints: Array<{ level: number; text_ko: string; text_en: string }>;
  reference_answer: string;
}

interface EvaluationResult {
  score: number;
  feedback_ko: string;
  feedback_en: string;
  correct_parts: string[];
  missing_parts: string[];
  suggestions: string[];
}

interface ServerLlmConfig {
  provider: string;
  apiKey: string;
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Resolve an LLM provider for the user.
 * Priority: BYOK key → server key (with usage check).
 */
async function resolveLlmProvider(userId: string) {
  // 1. Try BYOK key
  const byokKey = await getDefaultLlmKeyForUser(userId);
  if (byokKey) {
    return {
      provider: createLLMProvider(byokKey.provider, byokKey.apiKey),
      isByok: true,
    };
  }

  // 2. Check usage limits for non-BYOK users
  const usageCheck = await checkUsageLimit(userId, "challenge");
  if (!usageCheck.allowed) {
    throw new Error(usageCheck.upgrade_message ?? "Challenge limit reached");
  }

  // 3. Get server LLM key from system settings
  const serverConfig = await getSystemSetting<ServerLlmConfig>("server_llm_config");
  if (!serverConfig?.provider || !serverConfig?.apiKey) {
    throw new Error(
      "No API key available. Please add your own API key in Settings.",
    );
  }

  return {
    provider: createLLMProvider(
      serverConfig.provider as Parameters<typeof createLLMProvider>[0],
      serverConfig.apiKey,
    ),
    isByok: false,
  };
}

async function getUserLocale(userId: string): Promise<Locale> {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("users")
    .select("locale")
    .eq("id", userId)
    .single();
  return (data?.locale as Locale) ?? "ko";
}

function parseJsonResponse<T>(content: string): T {
  // Strip markdown fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return JSON.parse(cleaned) as T;
}

// ── Server Actions ─────────────────────────────────────────────

/**
 * Generate a new refactoring challenge from improvement items.
 */
export async function generateChallenge(
  projectId: string,
  difficulty: Difficulty = "intermediate",
): Promise<ActionResult<ChallengeItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify project ownership
    const serviceClient = createServiceClient();
    const { data: project } = await serviceClient
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Get health score with improvement items
    const { data: healthScore } = await serviceClient
      .from("code_health_scores")
      .select("improvement_items")
      .eq("project_id", projectId)
      .single();

    if (!healthScore) {
      return {
        success: false,
        error: "Health score not found. Please calculate health score first.",
      };
    }

    const improvementItems = healthScore.improvement_items as unknown as ImprovementItem[];
    if (improvementItems.length === 0) {
      return {
        success: false,
        error: "No improvement items found. Your code is already in great shape!",
      };
    }

    // Pick a random improvement item (prefer higher severity)
    const sorted = [...improvementItems].sort((a, b) => {
      const severityOrder = { important: 0, warning: 1, info: 2 };
      return (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
    });
    const item = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];

    // Get the original code from the first relevant file
    let originalCode = "";
    if (item.files.length > 0) {
      const { data: fileData } = await serviceClient
        .from("project_files")
        .select("raw_content")
        .eq("project_id", projectId)
        .eq("file_path", item.files[0])
        .single();

      if (fileData?.raw_content) {
        // Truncate to 3000 chars
        originalCode = fileData.raw_content.slice(0, 3000);
      }
    }

    if (!originalCode) {
      // Fallback: use any project file
      const { data: anyFile } = await serviceClient
        .from("project_files")
        .select("raw_content")
        .eq("project_id", projectId)
        .not("raw_content", "is", null)
        .limit(1)
        .single();

      originalCode = anyFile?.raw_content?.slice(0, 3000) ?? "// No code available";
    }

    // Get user locale
    const locale = await getUserLocale(user.id);

    // Resolve LLM provider (BYOK → server key)
    const { provider } = await resolveLlmProvider(user.id);

    // Generate challenge via LLM
    const prompt = buildChallengeGenerationPrompt(
      originalCode,
      item.description,
      item.suggestion,
      difficulty,
      locale,
    );

    const chatResult = await provider.chat({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 4000,
    });

    const generated = parseJsonResponse<GeneratedChallenge>(chatResult.content);

    // Save to DB
    const { data: challenge, error: insertError } = await serviceClient
      .from("refactoring_challenges")
      .insert({
        user_id: user.id,
        project_id: projectId,
        mission_text_ko: generated.mission_text_ko,
        mission_text_en: generated.mission_text_en,
        original_code: originalCode,
        reference_answer: generated.reference_answer,
        hints: generated.hints as unknown as Json,
        difficulty,
        status: "pending",
      })
      .select("id, project_id, mission_text_ko, mission_text_en, original_code, difficulty, status, score, hints, created_at, completed_at")
      .single();

    if (insertError || !challenge) {
      return { success: false, error: "Failed to save challenge" };
    }

    return {
      success: true,
      data: {
        id: challenge.id,
        projectId: challenge.project_id,
        missionTextKo: challenge.mission_text_ko,
        missionTextEn: challenge.mission_text_en,
        originalCode: challenge.original_code,
        difficulty: challenge.difficulty as Difficulty,
        status: challenge.status as ChallengeStatus,
        score: challenge.score,
        hints: challenge.hints as unknown as ChallengeItem["hints"],
        createdAt: challenge.created_at,
        completedAt: challenge.completed_at,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate challenge";
    return { success: false, error: message };
  }
}

/**
 * Submit user's code for evaluation.
 */
export async function submitChallengeAnswer(
  challengeId: string,
  userCode: string,
): Promise<ActionResult<{ score: number; feedback: EvaluationResult }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get challenge
    const serviceClient = createServiceClient();
    const { data: challenge } = await serviceClient
      .from("refactoring_challenges")
      .select("id, user_id, original_code, mission_text_ko, mission_text_en, reference_answer, status")
      .eq("id", challengeId)
      .eq("user_id", user.id)
      .single();

    if (!challenge) {
      return { success: false, error: "Challenge not found" };
    }

    if (challenge.status === "completed" || challenge.status === "skipped") {
      return { success: false, error: "Challenge already completed" };
    }

    // Validate submission size (prevent token exhaustion)
    const MAX_SUBMISSION_SIZE = 50_000;
    if (userCode.length > MAX_SUBMISSION_SIZE) {
      return {
        success: false,
        error: `Submission exceeds ${MAX_SUBMISSION_SIZE / 1000}KB limit`,
      };
    }

    // Get user locale
    const locale = await getUserLocale(user.id);

    // Resolve LLM provider
    const { provider } = await resolveLlmProvider(user.id);

    // Evaluate via LLM
    const missionText = locale === "ko" ? challenge.mission_text_ko : challenge.mission_text_en;
    const prompt = buildChallengeEvaluationPrompt(
      challenge.original_code,
      missionText,
      userCode,
      challenge.reference_answer ?? "",
      locale,
    );

    const chatResult = await provider.chat({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 4000,
    });

    const evaluation = parseJsonResponse<EvaluationResult>(chatResult.content);
    const now = new Date().toISOString();

    // Update challenge
    const { error: updateError } = await serviceClient
      .from("refactoring_challenges")
      .update({
        user_submission: userCode,
        score: evaluation.score,
        ai_feedback: evaluation as unknown as Json,
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", challengeId);

    if (updateError) {
      return { success: false, error: "Failed to save submission" };
    }

    // Award points for challenge completion
    try {
      await awardPoints(user.id, POINT_AWARDS.REFACTOR_CHALLENGE, "refactor_challenge", challengeId, "refactoring_challenge");
    } catch {
      // Point award failure should not block challenge submission
    }

    return {
      success: true,
      data: {
        score: evaluation.score,
        feedback: evaluation,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to evaluate submission";
    return { success: false, error: message };
  }
}

/**
 * Get challenges for a project.
 */
export async function getChallenges(
  projectId: string,
): Promise<ActionResult<ChallengeItem[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: challenges, error } = await supabase
      .from("refactoring_challenges")
      .select("id, project_id, mission_text_ko, mission_text_en, original_code, difficulty, status, score, hints, created_at, completed_at")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to load challenges" };
    }

    return {
      success: true,
      data: (challenges ?? []).map((c) => ({
        id: c.id,
        projectId: c.project_id,
        missionTextKo: c.mission_text_ko,
        missionTextEn: c.mission_text_en,
        originalCode: c.original_code,
        difficulty: c.difficulty as Difficulty,
        status: c.status as ChallengeStatus,
        score: c.score,
        hints: c.hints as unknown as ChallengeItem["hints"],
        createdAt: c.created_at,
        completedAt: c.completed_at,
      })),
    };
  } catch {
    return { success: false, error: "Failed to load challenges" };
  }
}

/**
 * Skip a challenge.
 */
export async function skipChallenge(
  challengeId: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("refactoring_challenges")
      .update({
        status: "skipped",
        updated_at: now,
      })
      .eq("id", challengeId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to skip challenge" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to skip challenge" };
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface FeedbackSummary {
  learningPathId: string;
  totalPositive: number;
  totalNegative: number;
  negativeRate: number;
}

/**
 * Get aggregated feedback summary for a learning path's tutor conversations.
 * Returns positive/negative counts to help identify content quality issues.
 */
export async function getFeedbackSummary(
  learningPathId: string,
): Promise<{ success: boolean; data?: FeedbackSummary; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get all conversations for this learning path
    const { data: conversations } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("learning_path_id", learningPathId)
      .eq("user_id", user.id);

    if (!conversations || conversations.length === 0) {
      return {
        success: true,
        data: {
          learningPathId,
          totalPositive: 0,
          totalNegative: 0,
          negativeRate: 0,
        },
      };
    }

    const conversationIds = conversations.map((c) => c.id);

    const { data: feedback } = await supabase
      .from("tutor_feedback")
      .select("rating")
      .in("conversation_id", conversationIds)
      .eq("user_id", user.id);

    const totalPositive = feedback?.filter((f) => f.rating === "positive").length ?? 0;
    const totalNegative = feedback?.filter((f) => f.rating === "negative").length ?? 0;
    const total = totalPositive + totalNegative;

    return {
      success: true,
      data: {
        learningPathId,
        totalPositive,
        totalNegative,
        negativeRate: total > 0 ? totalNegative / total : 0,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

interface ModuleFeedbackAlert {
  moduleId: string;
  moduleTitle: string;
  negativeCount: number;
  shouldRegenerate: boolean;
}

/**
 * Check if any modules in a learning path have excessive negative feedback.
 * Returns modules that might benefit from content regeneration.
 * Threshold: 3+ negative feedbacks on a single learning path's conversations.
 */
export async function getContentQualityAlerts(
  learningPathId: string,
): Promise<{ success: boolean; data?: ModuleFeedbackAlert[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get conversations for this path
    const { data: conversations } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("learning_path_id", learningPathId)
      .eq("user_id", user.id);

    if (!conversations || conversations.length === 0) {
      return { success: true, data: [] };
    }

    const conversationIds = conversations.map((c) => c.id);

    // Count negative feedback
    const { data: negativeFeedback, count } = await supabase
      .from("tutor_feedback")
      .select("id", { count: "exact" })
      .in("conversation_id", conversationIds)
      .eq("user_id", user.id)
      .eq("rating", "negative");

    const negativeCount = count ?? negativeFeedback?.length ?? 0;

    // Get modules for this learning path
    const serviceClient = createServiceClient();
    const { data: modules } = await serviceClient
      .from("learning_modules")
      .select("id, title, module_order")
      .eq("learning_path_id", learningPathId)
      .order("module_order");

    if (!modules || modules.length === 0) {
      return { success: true, data: [] };
    }

    // If the path has significant negative feedback, flag the first incomplete module
    // as the likely candidate for regeneration
    const NEGATIVE_THRESHOLD = 3;
    const alerts: ModuleFeedbackAlert[] = [];

    if (negativeCount >= NEGATIVE_THRESHOLD) {
      // Get progress to find incomplete modules
      const { data: progress } = await supabase
        .from("learning_progress")
        .select("module_id, status")
        .eq("user_id", user.id)
        .in("module_id", modules.map((m) => m.id));

      const completedIds = new Set(
        progress?.filter((p) => p.status === "completed").map((p) => p.module_id) ?? [],
      );

      for (const mod of modules) {
        if (!completedIds.has(mod.id)) {
          alerts.push({
            moduleId: mod.id,
            moduleTitle: mod.title,
            negativeCount,
            shouldRegenerate: negativeCount >= NEGATIVE_THRESHOLD * 2,
          });
          break; // Only flag the first incomplete module
        }
      }

      // If all modules are completed but feedback is still bad, flag the last module
      if (alerts.length === 0 && modules.length > 0) {
        alerts.push({
          moduleId: modules[modules.length - 1].id,
          moduleTitle: modules[modules.length - 1].title,
          negativeCount,
          shouldRegenerate: negativeCount >= NEGATIVE_THRESHOLD * 2,
        });
      }
    }

    return { success: true, data: alerts };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

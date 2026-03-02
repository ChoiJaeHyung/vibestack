"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/utils/rate-limit";
import type { TutorFeedbackRating } from "@/types/database";

/**
 * Submit or update feedback for a tutor message (upsert).
 */
export async function submitTutorFeedback(
  conversationId: string,
  messageIndex: number,
  rating: TutorFeedbackRating,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const rl = rateLimit(`tutor-feedback:${user.id}`, 30);
    if (!rl.success) {
      return { success: false, error: "Too many requests" };
    }

    // Verify conversation ownership
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (!conv) {
      return { success: false, error: "Conversation not found" };
    }

    const serviceClient = createServiceClient();
    const { error: upsertError } = await serviceClient
      .from("tutor_feedback")
      .upsert(
        {
          user_id: user.id,
          conversation_id: conversationId,
          message_index: messageIndex,
          rating,
        },
        { onConflict: "user_id,conversation_id,message_index" },
      );

    if (upsertError) {
      return { success: false, error: "Failed to save feedback" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Remove feedback for a tutor message (toggle off).
 */
export async function removeTutorFeedback(
  conversationId: string,
  messageIndex: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const serviceClient = createServiceClient();
    await serviceClient
      .from("tutor_feedback")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("message_index", messageIndex)
      .eq("user_id", user.id);

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get all feedback for a conversation as a map: messageIndex → rating.
 */
export async function getFeedbackForConversation(
  conversationId: string,
): Promise<Record<number, TutorFeedbackRating>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return {};

    const { data } = await supabase
      .from("tutor_feedback")
      .select("message_index, rating")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    const map: Record<number, TutorFeedbackRating> = {};
    for (const row of data ?? []) {
      map[row.message_index] = row.rating as TutorFeedbackRating;
    }
    return map;
  } catch {
    return {};
  }
}

"use server";

import { getAuthUser } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";

interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Permanently deletes a user account and all associated data.
 *
 * CASCADE rules handle most related data (projects, learning_paths, etc.).
 * Stripe subscription is cancelled if active.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "NOT_AUTHENTICATED" };
    }

    const serviceClient = createServiceClient();

    // 1. Cancel active Stripe subscription if exists
    const { data: userData } = await serviceClient
      .from("users")
      .select("stripe_customer_id, stripe_subscription_id, plan_type")
      .eq("id", user.id)
      .single();

    if (userData?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(userData.stripe_subscription_id);
      } catch {
        // Subscription may already be cancelled — continue with deletion
      }
    }

    // 2. Delete user data (CASCADE handles projects, learning, conversations, etc.)
    // Tables with ON DELETE CASCADE from users:
    //   user_api_keys, user_llm_keys, projects (→ project_files, tech_stacks, etc.),
    //   learning_paths (→ learning_modules, learning_progress),
    //   ai_conversations, user_streaks, user_concept_mastery,
    //   user_points, point_transactions, user_badges, user_rewards, tutor_feedback

    // Delete from users table (CASCADE handles the rest)
    const { error: deleteError } = await serviceClient
      .from("users")
      .delete()
      .eq("id", user.id);

    if (deleteError) {
      return { success: false, error: "ACCOUNT_DELETE_FAILED" };
    }

    // 3. Delete Supabase Auth user
    const { error: authError } = await serviceClient.auth.admin.deleteUser(
      user.id,
    );

    if (authError) {
      // User data is already deleted but auth entry remains
      // This is acceptable — orphaned auth entry will not have matching data
      console.error("Failed to delete auth user:", authError.message);
    }

    return { success: true };
  } catch (error) {
    console.error("Account deletion error:", error);
    return { success: false, error: "UNEXPECTED_ERROR" };
  }
}

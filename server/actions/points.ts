"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSystemSetting } from "@/lib/utils/system-settings";
import type { PointBalance, PointTransaction, RewardItem } from "./point-constants";

// ── Server Actions ──────────────────────────────────────────────────

/**
 * Award points to a user. Called internally from other server actions.
 * Uses service client to bypass RLS for cross-user operations.
 * NOT fire-and-forget — failures are logged but don't throw.
 */
export async function awardPoints(
  userId: string,
  amount: number,
  transactionType: string,
  sourceId?: string,
  sourceType?: string,
  description?: string,
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    // Check if point system is enabled
    const enabled = await getSystemSetting<boolean>("point_system_enabled");
    if (!enabled) {
      return { success: true }; // Silently skip
    }

    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    const serviceClient = createServiceClient();

    // Get or create user_points record
    const { data: existing } = await serviceClient
      .from("user_points")
      .select("current_balance, total_earned")
      .eq("user_id", userId)
      .single();

    const currentBalance = existing?.current_balance ?? 0;
    const totalEarned = existing?.total_earned ?? 0;
    const newBalance = currentBalance + amount;
    const newTotalEarned = totalEarned + amount;

    // Upsert balance
    const { error: upsertError } = await serviceClient
      .from("user_points")
      .upsert(
        {
          user_id: userId,
          current_balance: newBalance,
          total_earned: newTotalEarned,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      console.error("[awardPoints] upsert error:", upsertError);
      return { success: false, error: "Failed to update balance" };
    }

    // Insert transaction record (triggers daily_point_summary via DB trigger)
    const { error: txError } = await serviceClient
      .from("point_transactions")
      .insert({
        user_id: userId,
        amount,
        transaction_type: transactionType,
        source_id: sourceId ?? null,
        source_type: sourceType ?? null,
        description: description ?? null,
      });

    if (txError) {
      console.error("[awardPoints] transaction insert error:", txError);
      // Balance already updated, transaction logging failed — not critical
    }

    return { success: true, newBalance };
  } catch (err) {
    console.error("[awardPoints] unexpected error:", err);
    return { success: false, error: "Failed to award points" };
  }
}

/**
 * Spend points (for reward purchases).
 * Returns the new balance on success.
 */
export async function spendPoints(
  userId: string,
  amount: number,
  transactionType: string,
  sourceId?: string,
  sourceType?: string,
  description?: string,
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    const serviceClient = createServiceClient();

    // Get current balance
    const { data: existing } = await serviceClient
      .from("user_points")
      .select("current_balance")
      .eq("user_id", userId)
      .single();

    const currentBalance = existing?.current_balance ?? 0;

    if (currentBalance < amount) {
      return { success: false, error: "Insufficient balance" };
    }

    const newBalance = currentBalance - amount;

    // Update balance
    const { error: updateError } = await serviceClient
      .from("user_points")
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      return { success: false, error: "Failed to update balance" };
    }

    // Insert negative transaction
    await serviceClient.from("point_transactions").insert({
      user_id: userId,
      amount: -amount,
      transaction_type: transactionType,
      source_id: sourceId ?? null,
      source_type: sourceType ?? null,
      description: description ?? null,
    });

    return { success: true, newBalance };
  } catch {
    return { success: false, error: "Failed to spend points" };
  }
}

/**
 * Get current user's point balance.
 */
export async function getPointBalance(): Promise<{
  success: boolean;
  data?: PointBalance;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data } = await supabase
      .from("user_points")
      .select("current_balance, total_earned")
      .eq("user_id", user.id)
      .single();

    return {
      success: true,
      data: {
        currentBalance: data?.current_balance ?? 0,
        totalEarned: data?.total_earned ?? 0,
      },
    };
  } catch {
    return { success: false, error: "Failed to load point balance" };
  }
}

/**
 * Get point balance by userId (for dashboard API).
 */
export async function getPointBalanceByUserId(
  userId: string,
): Promise<PointBalance> {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("user_points")
    .select("current_balance, total_earned")
    .eq("user_id", userId)
    .single();

  return {
    currentBalance: data?.current_balance ?? 0,
    totalEarned: data?.total_earned ?? 0,
  };
}

/**
 * Get transaction history for the current user.
 */
export async function getTransactionHistory(
  limit = 20,
  offset = 0,
): Promise<{
  success: boolean;
  data?: PointTransaction[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: rows } = await supabase
      .from("point_transactions")
      .select("id, amount, transaction_type, source_type, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const transactions: PointTransaction[] = (rows ?? []).map((r) => ({
      id: r.id,
      amount: r.amount,
      transactionType: r.transaction_type,
      sourceType: r.source_type,
      description: r.description,
      createdAt: r.created_at,
    }));

    return { success: true, data: transactions };
  } catch {
    return { success: false, error: "Failed to load transaction history" };
  }
}

/**
 * Get all active rewards with purchase status for current user.
 */
export async function getActiveRewards(): Promise<{
  success: boolean;
  data?: RewardItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get user locale
    const { data: userData } = await supabase
      .from("users")
      .select("locale")
      .eq("id", user.id)
      .single();

    const locale = userData?.locale ?? "ko";

    // Get all active rewards
    const { data: rewards } = await supabase
      .from("rewards")
      .select("id, slug, name_ko, name_en, description_ko, description_en, cost, icon, category, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    // Get user's purchased rewards
    const { data: purchased } = await supabase
      .from("user_rewards")
      .select("reward_id")
      .eq("user_id", user.id);

    const purchasedIds = new Set((purchased ?? []).map((p) => p.reward_id));

    const items: RewardItem[] = (rewards ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: locale === "ko" ? r.name_ko : r.name_en,
      description: locale === "ko" ? r.description_ko : r.description_en,
      cost: r.cost,
      icon: r.icon,
      category: r.category,
      purchased: purchasedIds.has(r.id),
    }));

    return { success: true, data: items };
  } catch {
    return { success: false, error: "Failed to load rewards" };
  }
}

/**
 * Purchase a reward with points.
 */
export async function purchaseReward(
  rewardId: string,
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

    // Get reward details
    const { data: reward } = await supabase
      .from("rewards")
      .select("id, slug, cost, category")
      .eq("id", rewardId)
      .eq("is_active", true)
      .single();

    if (!reward) {
      return { success: false, error: "Reward not found" };
    }

    // Check if user is BYOK and reward is server_key_only
    if (reward.category === "server_key_only") {
      const serviceClient = createServiceClient();
      const { count: keyCount } = await serviceClient
        .from("user_llm_keys")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_valid", true);

      if (keyCount && keyCount > 0) {
        return { success: false, error: "Already unlimited with BYOK" };
      }
    }

    // Spend points
    const spendResult = await spendPoints(
      user.id,
      reward.cost,
      "reward_purchase",
      reward.id,
      "reward",
      reward.slug,
    );

    if (!spendResult.success) {
      return { success: false, error: spendResult.error };
    }

    // Create user_reward record
    const serviceClient = createServiceClient();
    const { error: insertError } = await serviceClient
      .from("user_rewards")
      .insert({
        user_id: user.id,
        reward_id: rewardId,
      });

    if (insertError) {
      // Refund points if reward creation fails
      await awardPoints(
        user.id,
        reward.cost,
        "reward_refund",
        reward.id,
        "reward",
        `Refund: ${reward.slug}`,
      );
      return { success: false, error: "Failed to activate reward" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get count of active (unused) rewards for a specific type.
 * Used by usage-limits to apply reward-based limit increases.
 */
export async function getActiveRewardCount(
  userId: string,
  rewardSlug: string,
): Promise<number> {
  const serviceClient = createServiceClient();
  const { data: reward } = await serviceClient
    .from("rewards")
    .select("id")
    .eq("slug", rewardSlug)
    .single();

  if (!reward) return 0;

  const { count } = await serviceClient
    .from("user_rewards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reward_id", reward.id)
    .eq("is_used", false);

  return count ?? 0;
}

/**
 * Update user nickname.
 */
export async function updateNickname(
  nickname: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!nickname || nickname.length < 2 || nickname.length > 30) {
      return { success: false, error: "Nickname must be 2-30 characters" };
    }

    // Basic sanitization: alphanumeric, Korean, spaces, underscores, hyphens
    const validPattern = /^[\w가-힣\s-]+$/;
    if (!validPattern.test(nickname)) {
      return { success: false, error: "Invalid nickname characters" };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const serviceClient = createServiceClient();
    const { error: updateError } = await serviceClient
      .from("users")
      .update({ nickname })
      .eq("id", user.id);

    if (updateError) {
      return { success: false, error: "Failed to update nickname" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

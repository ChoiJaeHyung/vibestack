import { createServiceClient } from "@/lib/supabase/service";
import { getSystemSetting } from "@/lib/utils/system-settings";

type UsageAction = "analysis" | "learning" | "chat";

interface UsageLimitResult {
  allowed: boolean;
  remaining?: number;
  limit?: number;
  upgrade_message?: string;
}

const DEFAULT_FREE_TIER_LIMITS: Record<UsageAction, number> = {
  analysis: 3,
  learning: 1,
  chat: 20,
};

const UPGRADE_MESSAGES: Record<UsageAction, string> = {
  analysis:
    "You've reached the free tier limit of 3 projects. Upgrade to Pro for unlimited projects.",
  learning:
    "You've reached the free tier limit of 1 learning roadmap per month. Upgrade to Pro for unlimited roadmaps.",
  chat:
    "You've reached the free tier limit of 20 AI conversations per month. Upgrade to Pro for unlimited conversations.",
};

async function getFreeTierLimits(): Promise<Record<UsageAction, number>> {
  const dynamic = await getSystemSetting<Record<string, number>>("free_tier_limits");
  if (dynamic) {
    return {
      analysis: dynamic.analysis ?? DEFAULT_FREE_TIER_LIMITS.analysis,
      learning: dynamic.learning ?? DEFAULT_FREE_TIER_LIMITS.learning,
      chat: dynamic.chat ?? DEFAULT_FREE_TIER_LIMITS.chat,
    };
  }
  return DEFAULT_FREE_TIER_LIMITS;
}

export async function checkUsageLimit(
  userId: string,
  action: UsageAction,
): Promise<UsageLimitResult> {
  try {
    const supabase = createServiceClient();

    // Fetch user's plan type
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("plan_type")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return { allowed: false, upgrade_message: "User not found" };
    }

    // Pro and team users always have unlimited access
    if (user.plan_type === "pro" || user.plan_type === "team") {
      return { allowed: true };
    }

    // Free tier — check limits based on action
    const limits = await getFreeTierLimits();
    const limit = limits[action];
    const currentCount = await getCurrentUsageCount(supabase, userId, action);
    const remaining = Math.max(0, limit - currentCount);

    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        upgrade_message: UPGRADE_MESSAGES[action],
      };
    }

    return {
      allowed: true,
      remaining,
      limit,
    };
  } catch {
    return { allowed: false, upgrade_message: "Failed to check usage limits" };
  }
}

async function getCurrentUsageCount(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  action: UsageAction,
): Promise<number> {
  switch (action) {
    case "analysis": {
      // Count total projects for the user
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      return count ?? 0;
    }

    case "learning": {
      // Count learning paths created this month
      const startOfMonth = getStartOfMonth();
      const { count } = await supabase
        .from("learning_paths")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);

      return count ?? 0;
    }

    case "chat": {
      // Count AI conversations created this month
      const startOfMonth = getStartOfMonth();
      const { count } = await supabase
        .from("ai_conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);

      return count ?? 0;
    }
  }
}

function getStartOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

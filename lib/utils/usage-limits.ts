import { createServiceClient } from "@/lib/supabase/service";
import { getSystemSetting } from "@/lib/utils/system-settings";

type UsageAction = "analysis" | "learning" | "chat";

interface UsageLimitResult {
  allowed: boolean;
  remaining?: number;
  limit?: number;
  upgrade_message?: string;
}

export interface UsageWarning {
  level: "none" | "warning" | "critical" | "exceeded";
  used: number;
  limit: number;
  percentage: number;
}

export const FREE_LIMITS = {
  analysis: 3,
  learning: 1,
  chat: 20,
} as const;

const DEFAULT_FREE_TIER_LIMITS: Record<UsageAction, number> = {
  analysis: FREE_LIMITS.analysis,
  learning: FREE_LIMITS.learning,
  chat: FREE_LIMITS.chat,
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

interface UserUsageInfo {
  planType: string;
  used: number;
  limit: number;
}

async function getUserUsageInfo(
  userId: string,
  action: UsageAction,
): Promise<UserUsageInfo | null> {
  const supabase = createServiceClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("plan_type")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return null;
  }

  const isPaid = user.plan_type === "pro" || user.plan_type === "team";

  if (isPaid) {
    return { planType: user.plan_type, used: 0, limit: Infinity };
  }

  const limits = await getFreeTierLimits();
  const limit = limits[action];
  const used = await getCurrentUsageCount(supabase, userId, action);

  return { planType: user.plan_type, used, limit };
}

export async function checkUsageLimit(
  userId: string,
  action: UsageAction,
): Promise<UsageLimitResult> {
  try {
    const info = await getUserUsageInfo(userId, action);

    if (!info) {
      return { allowed: false, upgrade_message: "User not found" };
    }

    if (info.limit === Infinity) {
      return { allowed: true };
    }

    const remaining = Math.max(0, info.limit - info.used);

    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        limit: info.limit,
        upgrade_message: UPGRADE_MESSAGES[action],
      };
    }

    return {
      allowed: true,
      remaining,
      limit: info.limit,
    };
  } catch {
    return { allowed: false, upgrade_message: "Failed to check usage limits" };
  }
}

export async function getUsageWarning(
  type: "analysis" | "learning" | "chat",
  userId: string,
): Promise<UsageWarning> {
  try {
    const info = await getUserUsageInfo(userId, type);

    if (!info || info.limit === Infinity) {
      return { level: "none", used: info?.used ?? 0, limit: Infinity, percentage: 0 };
    }

    const percentage = info.limit > 0 ? Math.round((info.used / info.limit) * 100) : 0;

    let level: UsageWarning["level"];
    if (percentage >= 100) {
      level = "exceeded";
    } else if (percentage >= 90) {
      level = "critical";
    } else if (percentage >= 80) {
      level = "warning";
    } else {
      level = "none";
    }

    return { level, used: info.used, limit: info.limit, percentage };
  } catch {
    return { level: "none", used: 0, limit: Infinity, percentage: 0 };
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

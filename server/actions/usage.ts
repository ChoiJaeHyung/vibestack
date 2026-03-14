"use server";

import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { checkTokenBudget } from "@/lib/utils/usage-limits";

// ─── Response Types ──────────────────────────────────────────────────

export interface UsageData {
  projects: { used: number; limit: number | null };
  learningPaths: { used: number; limit: number | null };
  aiChats: { used: number; limit: number | null };
  tokenBudget: { used: number; limit: number | null } | null;
  planType: "free" | "pro" | "team";
}

interface UsageDataResult {
  success: boolean;
  data?: UsageData;
  error?: string;
}

const FREE_LIMITS = {
  projects: 3,
  learningPaths: 1,
  aiChats: 20,
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getStartOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// ─── Server Action ──────────────────────────────────────────────────

export async function getUsageData(): Promise<UsageDataResult> {
  try {
    const user = await getAuthUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const supabase = await createClient();

    const startOfMonth = getStartOfMonth();

    // Parallelize all 4 queries (was 4 sequential round-trips)
    const [userResult, projectResult, learningPathResult, aiChatResult] =
      await Promise.all([
        supabase
          .from("users")
          .select("plan_type")
          .eq("id", user.id)
          .single(),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("learning_paths")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth),
        supabase
          .from("ai_conversations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth),
      ]);

    if (userResult.error || !userResult.data) {
      return { success: false, error: "User not found" };
    }

    const planType = (userResult.data.plan_type ?? "free") as
      | "free"
      | "pro"
      | "team";
    const isFree = planType === "free";
    const projectCount = projectResult.count;
    const learningPathCount = learningPathResult.count;
    const aiChatCount = aiChatResult.count;

    // Fetch token budget for Free non-BYOK users
    let tokenBudget: UsageData["tokenBudget"] = null;
    if (isFree) {
      const tb = await checkTokenBudget(user.id);
      if (tb.budget !== null) {
        tokenBudget = { used: tb.used, limit: tb.budget };
      }
    }

    return {
      success: true,
      data: {
        projects: {
          used: projectCount ?? 0,
          limit: isFree ? FREE_LIMITS.projects : null,
        },
        learningPaths: {
          used: learningPathCount ?? 0,
          limit: isFree ? FREE_LIMITS.learningPaths : null,
        },
        aiChats: {
          used: aiChatCount ?? 0,
          limit: isFree ? FREE_LIMITS.aiChats : null,
        },
        tokenBudget,
        planType,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

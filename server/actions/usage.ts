"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Response Types ──────────────────────────────────────────────────

export interface UsageData {
  projects: { used: number; limit: number | null };
  learningPaths: { used: number; limit: number | null };
  aiChats: { used: number; limit: number | null };
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
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

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
        planType,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ─── Types ──────────────────────────────────────────────────────────

export interface BadgeInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  conditionType: string;
  conditionValue: number;
}

export interface EarnedBadge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface NewlyEarnedBadge {
  name: string;
  icon: string;
  description: string;
}

export interface BadgeCheckContext {
  event: "module_complete" | "streak_update" | "tutor_chat";
  moduleScore?: number;
  timeSpentSeconds?: number;
  currentStreak?: number;
}

// ─── Public Functions ───────────────────────────────────────────────

export async function getUserBadges(userId: string): Promise<EarnedBadge[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_badges")
    .select("earned_at, badges(id, slug, name, description, icon)")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const badge = row.badges as unknown as {
      id: string;
      slug: string;
      name: string;
      description: string;
      icon: string;
    };
    return {
      id: badge.id,
      slug: badge.slug,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earnedAt: row.earned_at,
    };
  });
}

export async function getAllBadges(): Promise<BadgeInfo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("badges")
    .select("id, slug, name, description, icon, condition_type, condition_value")
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    icon: b.icon,
    conditionType: b.condition_type,
    conditionValue: b.condition_value,
  }));
}

export async function checkAndAwardBadges(
  userId: string,
  context: BadgeCheckContext,
): Promise<NewlyEarnedBadge[]> {
  const serviceClient = createServiceClient();

  // Fetch all badges + already earned badges in parallel
  const [allBadgesResult, earnedResult] = await Promise.all([
    serviceClient
      .from("badges")
      .select("id, slug, name, description, icon, condition_type, condition_value"),
    serviceClient
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId),
  ]);

  const allBadges = allBadgesResult.data ?? [];
  const earnedBadgeIds = new Set(
    (earnedResult.data ?? []).map((ub) => ub.badge_id),
  );

  // Filter to unevaluated badges only
  const unearnedBadges = allBadges.filter((b) => !earnedBadgeIds.has(b.id));
  if (unearnedBadges.length === 0) return [];

  // Check each badge condition
  const newlyEarned: NewlyEarnedBadge[] = [];
  const toInsert: Array<{ user_id: string; badge_id: string }> = [];

  for (const badge of unearnedBadges) {
    const met = await checkCondition(
      serviceClient,
      userId,
      badge.condition_type,
      badge.condition_value,
      context,
    );

    if (met) {
      toInsert.push({ user_id: userId, badge_id: badge.id });
      newlyEarned.push({
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
      });
    }
  }

  // Batch insert new badges
  if (toInsert.length > 0) {
    await serviceClient.from("user_badges").insert(toInsert);
  }

  return newlyEarned;
}

// ─── Condition Checkers ─────────────────────────────────────────────

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

async function checkCondition(
  supabase: SupabaseServiceClient,
  userId: string,
  conditionType: string,
  conditionValue: number,
  context: BadgeCheckContext,
): Promise<boolean> {
  switch (conditionType) {
    case "module_complete_total":
      return checkModuleCompleteTotal(supabase, userId, conditionValue);

    case "streak_days":
      return (context.currentStreak ?? 0) >= conditionValue;

    case "quiz_perfect_streak":
      return checkQuizPerfectStreak(supabase, userId, conditionValue);

    case "challenge_complete":
      return checkChallengeComplete(supabase, userId, conditionValue);

    case "path_complete":
      return checkPathComplete(supabase, userId, conditionValue);

    case "tech_variety":
      return checkTechVariety(supabase, userId, conditionValue);

    case "tutor_chats":
      return checkTutorChats(supabase, userId, conditionValue);

    case "fast_complete_minutes":
      return (
        context.event === "module_complete" &&
        context.timeSpentSeconds !== undefined &&
        context.timeSpentSeconds / 60 <= conditionValue
      );

    default:
      return false;
  }
}

async function checkModuleCompleteTotal(
  supabase: SupabaseServiceClient,
  userId: string,
  conditionValue: number,
): Promise<boolean> {
  const { count } = await supabase
    .from("learning_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");

  return (count ?? 0) >= conditionValue;
}

async function checkQuizPerfectStreak(
  supabase: SupabaseServiceClient,
  userId: string,
  conditionValue: number,
): Promise<boolean> {
  // Get most recent completed modules ordered by completion date (desc)
  const { data } = await supabase
    .from("learning_progress")
    .select("score")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("score", "is", null)
    .order("completed_at", { ascending: false })
    .limit(conditionValue);

  if (!data || data.length < conditionValue) return false;

  // Check if the most recent N scores are all 100
  return data.every((p) => p.score === 100);
}

async function checkChallengeComplete(
  supabase: SupabaseServiceClient,
  userId: string,
  conditionValue: number,
): Promise<boolean> {
  // Count completed modules that are practical/project_walkthrough type (challenge-like)
  // We need to join learning_progress with learning_modules to check module_type
  const { data: completedModuleIds } = await supabase
    .from("learning_progress")
    .select("module_id")
    .eq("user_id", userId)
    .eq("status", "completed");

  if (!completedModuleIds || completedModuleIds.length === 0) return false;

  const moduleIds = completedModuleIds.map((p) => p.module_id);

  const { count } = await supabase
    .from("learning_modules")
    .select("id", { count: "exact", head: true })
    .in("id", moduleIds)
    .in("module_type", ["practical", "project_walkthrough"]);

  return (count ?? 0) >= conditionValue;
}

async function checkPathComplete(
  supabase: SupabaseServiceClient,
  userId: string,
  conditionValue: number,
): Promise<boolean> {
  const { count } = await supabase
    .from("learning_paths")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");

  return (count ?? 0) >= conditionValue;
}

async function checkTechVariety(
  supabase: SupabaseServiceClient,
  userId: string,
  conditionValue: number,
): Promise<boolean> {
  // Count distinct technology names across user's projects
  const { data: projectIds } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId);

  if (!projectIds || projectIds.length === 0) return false;

  const ids = projectIds.map((p) => p.id);

  const { data: techStacks } = await supabase
    .from("tech_stacks")
    .select("technology_name")
    .in("project_id", ids);

  if (!techStacks) return false;

  const uniqueTechs = new Set(techStacks.map((t) => t.technology_name));
  return uniqueTechs.size >= conditionValue;
}

async function checkTutorChats(
  supabase: SupabaseServiceClient,
  userId: string,
  conditionValue: number,
): Promise<boolean> {
  const { count } = await supabase
    .from("ai_conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return (count ?? 0) >= conditionValue;
}

"use server";

import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────

type UserStreakRow = Database["public"]["Tables"]["user_streaks"]["Row"];

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  weeklyTarget: number;
  lastActiveDate: string | null;
  weekActiveDays: number;
  weekStartDate: string | null;
}

interface StreakResult {
  success: boolean;
  data?: StreakData;
  error?: string;
}

// ─── Date Helpers (KST) ─────────────────────────────────────────────

function getTodayKST(): string {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

function getYesterdayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - 1);
  return kst.toISOString().split("T")[0];
}

function getMondayOfWeekKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dayOfWeek = kst.getDay(); // 0=Sun, 1=Mon, ...
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since Monday
  kst.setDate(kst.getDate() - diff);
  return kst.toISOString().split("T")[0];
}

function rowToStreakData(row: UserStreakRow): StreakData {
  return {
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    weeklyTarget: row.weekly_target,
    lastActiveDate: row.last_active_date,
    weekActiveDays: row.week_active_days,
    weekStartDate: row.week_start_date,
  };
}

// ─── getStreak ──────────────────────────────────────────────────────

export async function getStreak(userId: string): Promise<StreakResult> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      // No record yet — return defaults
      return {
        success: true,
        data: {
          currentStreak: 0,
          longestStreak: 0,
          weeklyTarget: 3,
          lastActiveDate: null,
          weekActiveDays: 0,
          weekStartDate: null,
        },
      };
    }

    return { success: true, data: rowToStreakData(data) };
  } catch {
    return { success: false, error: "Failed to fetch streak data" };
  }
}

// ─── updateStreak ───────────────────────────────────────────────────

export async function updateStreak(userId: string): Promise<StreakResult> {
  try {
    const supabase = createServiceClient();

    const today = getTodayKST();
    const yesterday = getYesterdayKST();
    const monday = getMondayOfWeekKST();

    // Fetch existing record
    const { data: existing } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existing && existing.last_active_date === today) {
      // Already recorded today — no change
      return { success: true, data: rowToStreakData(existing) };
    }

    // Calculate new streak values
    let newCurrentStreak: number;
    if (!existing || !existing.last_active_date) {
      newCurrentStreak = 1;
    } else if (existing.last_active_date === yesterday) {
      newCurrentStreak = existing.current_streak + 1;
    } else {
      newCurrentStreak = 1; // streak broken
    }

    const previousLongest = existing?.longest_streak ?? 0;
    const newLongestStreak = Math.max(newCurrentStreak, previousLongest);

    // Weekly logic
    let newWeekActiveDays: number;
    let newWeekStartDate: string;

    if (!existing || existing.week_start_date !== monday) {
      // New week — reset
      newWeekActiveDays = 1;
      newWeekStartDate = monday;
    } else {
      newWeekActiveDays = existing.week_active_days + 1;
      newWeekStartDate = monday;
    }

    const weeklyTarget = existing?.weekly_target ?? 3;

    // Upsert
    const { data: upserted, error } = await supabase
      .from("user_streaks")
      .upsert(
        {
          user_id: userId,
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          weekly_target: weeklyTarget,
          last_active_date: today,
          week_active_days: newWeekActiveDays,
          week_start_date: newWeekStartDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error || !upserted) {
      return { success: false, error: "Failed to update streak" };
    }

    return { success: true, data: rowToStreakData(upserted) };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ─── updateWeeklyTarget ─────────────────────────────────────────────

const VALID_TARGETS = [2, 3, 5, 7] as const;

export async function updateWeeklyTarget(
  userId: string,
  target: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!VALID_TARGETS.includes(target as typeof VALID_TARGETS[number])) {
      return { success: false, error: "Invalid target value" };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("user_streaks")
      .upsert(
        {
          user_id: userId,
          weekly_target: target,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) {
      return { success: false, error: "Failed to update weekly target" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Flame, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  weeklyTarget: number;
  weekActiveDays: number;
  lastActiveDate: string | null;
  /** Link to continue learning (module detail page) */
  currentLearningHref?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getMondayOfWeekKST(): Date {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dayOfWeek = kst.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  kst.setDate(kst.getDate() - diff);
  kst.setHours(0, 0, 0, 0);
  return kst;
}

function getDayOfWeekIndexKST(): number {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getDay();
  return day === 0 ? 6 : day - 1; // 0=Monday ... 6=Sunday
}

/**
 * Estimate which days of the week had learning activity.
 * We know the user was active on `weekActiveDays` days this week,
 * and the most recent day is `lastActiveDate`.
 * We fill backwards from the last active day.
 */
function getWeekActivityMap(
  weekActiveDays: number,
  lastActiveDate: string | null,
): boolean[] {
  const result = [false, false, false, false, false, false, false];

  if (weekActiveDays <= 0 || !lastActiveDate) return result;

  const monday = getMondayOfWeekKST();
  const lastActive = new Date(lastActiveDate + "T00:00:00+09:00");

  // Check if lastActiveDate is in this week
  const sundayEnd = new Date(monday);
  sundayEnd.setDate(sundayEnd.getDate() + 7);

  if (lastActive < monday || lastActive >= sundayEnd) {
    return result; // Not in this week
  }

  // Day index of last active (0=Monday)
  const lastActiveDay = lastActive.getDay();
  const lastActiveDayIdx = lastActiveDay === 0 ? 6 : lastActiveDay - 1;

  // Fill backwards from lastActiveDayIdx
  let filled = 0;
  for (let i = lastActiveDayIdx; i >= 0 && filled < weekActiveDays; i--) {
    result[i] = true;
    filled++;
  }

  return result;
}

// ─── Component ──────────────────────────────────────────────────────

export function StreakWidget({
  currentStreak,
  longestStreak,
  weeklyTarget,
  weekActiveDays,
  lastActiveDate,
  currentLearningHref,
}: StreakWidgetProps) {
  const t = useTranslations("Dashboard");
  const todayIdx = getDayOfWeekIndexKST();
  const activityMap = getWeekActivityMap(weekActiveDays, lastActiveDate);
  const goalReached = weekActiveDays >= weeklyTarget;
  const progressPercent = weeklyTarget > 0
    ? Math.min((weekActiveDays / weeklyTarget) * 100, 100)
    : 0;

  const hasActivity = weekActiveDays > 0;
  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  // No activity this week — show CTA instead of empty calendar
  if (!hasActivity) {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-cyan-500/[0.04] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <Sparkles className="h-5 w-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              {t("streak.emptyCta.title")}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {t("streak.emptyCta.description")}
            </p>
          </div>
          <Link href={currentLearningHref ?? "/learning"}>
            <Button variant="primary" size="sm" className="shrink-0">
              {t("streak.emptyCta.button")}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {currentStreak > 0
                ? t("streak.activeStreak", { count: currentStreak })
                : t("streak.startToday")}
            </p>
            {longestStreak > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Trophy className="h-3 w-3 text-text-dim" />
                <p className="text-xs text-text-muted">
                  {t("streak.longest", { count: longestStreak })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="flex items-center justify-between gap-1 mb-4">
        {DAY_KEYS.map((key, idx) => {
          const isToday = idx === todayIdx;
          const isActive = activityMap[idx];

          return (
            <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[10px] font-medium text-text-dim">
                {t(`streak.days.${key}`)}
              </span>
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-violet-500"
                    : "bg-bg-input"
                } ${
                  isToday
                    ? "ring-2 ring-violet-500 ring-offset-1 ring-offset-bg-surface"
                    : ""
                }`}
              >
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly Goal Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-muted">
            {t("streak.weeklyGoal")}
          </span>
          <span className={`text-xs font-medium ${goalReached ? "text-green-500" : "text-text-secondary"}`}>
            {goalReached
              ? t("streak.goalReached")
              : t("streak.progress", { active: weekActiveDays, target: weeklyTarget })}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-bg-input overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${goalReached ? "bg-green-500" : "bg-violet-500"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

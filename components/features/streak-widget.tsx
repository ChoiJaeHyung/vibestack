"use client";

import { Flame, Trophy } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  weeklyTarget: number;
  weekActiveDays: number;
  lastActiveDate: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

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
}: StreakWidgetProps) {
  const todayIdx = getDayOfWeekIndexKST();
  const today = getTodayKST();
  const learnedToday = lastActiveDate === today;
  const activityMap = getWeekActivityMap(weekActiveDays, lastActiveDate);
  const goalReached = weekActiveDays >= weeklyTarget;
  const progressPercent = weeklyTarget > 0
    ? Math.min((weekActiveDays / weeklyTarget) * 100, 100)
    : 0;

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
                ? `${currentStreak}일 연속 학습 중`
                : "오늘 학습을 시작해보세요!"}
            </p>
            {longestStreak > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Trophy className="h-3 w-3 text-text-dim" />
                <p className="text-xs text-text-muted">
                  최장: {longestStreak}일
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="flex items-center justify-between gap-1 mb-4">
        {DAY_LABELS.map((label, idx) => {
          const isToday = idx === todayIdx;
          const isActive = activityMap[idx];

          return (
            <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[10px] font-medium text-text-dim">
                {label}
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
            주간 목표
          </span>
          <span className={`text-xs font-medium ${goalReached ? "text-green-500" : "text-text-secondary"}`}>
            {goalReached
              ? "이번 주 목표 달성!"
              : `${weekActiveDays}/${weeklyTarget}일`}
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

"use client";

import { useState, useTransition } from "react";
import { updateWeeklyTarget } from "@/server/actions/streak";

// ─── Types ──────────────────────────────────────────────────────────

interface WeeklyTargetSettingProps {
  userId: string;
  currentTarget: number;
}

const TARGET_OPTIONS = [
  { value: 2, label: "2일", desc: "가볍게" },
  { value: 3, label: "3일", desc: "추천" },
  { value: 5, label: "5일", desc: "꾸준히" },
  { value: 7, label: "매일", desc: "풀파워" },
] as const;

// ─── Component ──────────────────────────────────────────────────────

export function WeeklyTargetSetting({
  userId,
  currentTarget,
}: WeeklyTargetSettingProps) {
  const [selected, setSelected] = useState(currentTarget);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSelect(value: number) {
    if (value === selected || isPending) return;
    setSelected(value);
    setSaved(false);

    startTransition(async () => {
      const result = await updateWeeklyTarget(userId, value);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-secondary">
          주간 학습 일수
        </p>
        {saved && (
          <span className="text-xs text-green-500 font-medium">
            저장됨
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {TARGET_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(opt.value)}
              className={`relative rounded-xl border px-3 py-3 text-center transition-all ${
                isSelected
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-border-default bg-bg-surface hover:border-border-hover"
              } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <p className={`text-sm font-semibold ${isSelected ? "text-violet-400" : "text-text-primary"}`}>
                {opt.label}
              </p>
              <p className={`text-[10px] mt-0.5 ${isSelected ? "text-violet-400/70" : "text-text-dim"}`}>
                {opt.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

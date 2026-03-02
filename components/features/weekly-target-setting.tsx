"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateWeeklyTarget } from "@/server/actions/streak";

// ─── Types ──────────────────────────────────────────────────────────

interface WeeklyTargetSettingProps {
  userId: string;
  currentTarget: number;
}

// ─── Component ──────────────────────────────────────────────────────

export function WeeklyTargetSetting({
  userId,
  currentTarget,
}: WeeklyTargetSettingProps) {
  const t = useTranslations("Settings");
  const [selected, setSelected] = useState(currentTarget);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const TARGET_OPTIONS = [
    { value: 2, label: t("weeklyTarget.2days"), desc: t("weeklyTarget.2daysDesc") },
    { value: 3, label: t("weeklyTarget.3days"), desc: t("weeklyTarget.3daysDesc") },
    { value: 5, label: t("weeklyTarget.5days"), desc: t("weeklyTarget.5daysDesc") },
    { value: 7, label: t("weeklyTarget.7days"), desc: t("weeklyTarget.7daysDesc") },
  ];

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
          {t("weeklyTarget.label")}
        </p>
        {saved && (
          <span className="text-xs text-green-500 font-medium">
            {t("weeklyTarget.saved")}
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

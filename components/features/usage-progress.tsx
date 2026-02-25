"use client";

import Link from "next/link";

interface UsageProgressProps {
  label: string;
  used: number;
  limit: number | null;
  showUpgradeHint?: boolean;
}

export function UsageProgress({
  label,
  used,
  limit,
  showUpgradeHint,
}: UsageProgressProps) {
  if (limit === null) {
    return (
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        {label}: <span className="font-medium text-zinc-800 dark:text-zinc-200">무제한</span>
      </div>
    );
  }

  const percentage = Math.min((used / limit) * 100, 100);

  let barColor: string;
  if (percentage >= 90) {
    barColor = "bg-red-500";
  } else if (percentage >= 60) {
    barColor = "bg-amber-500";
  } else {
    barColor = "bg-emerald-500";
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showUpgradeHint && percentage >= 80 && (
        <Link
          href="/settings/billing"
          className="inline-block text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          업그레이드
        </Link>
      )}
    </div>
  );
}

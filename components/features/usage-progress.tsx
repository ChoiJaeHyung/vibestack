"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

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
  const tc = useTranslations("Common");

  if (limit === null) {
    return (
      <div className="text-sm text-text-muted">
        {label}: <span className="font-medium text-text-secondary">{tc("unlimited")}</span>
      </div>
    );
  }

  const percentage = Math.min((used / limit) * 100, 100);

  const barColor =
    percentage >= 90
      ? "bg-red-500"
      : "bg-gradient-to-r from-violet-500 to-cyan-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-tertiary">{label}</span>
        <span className="font-medium text-text-secondary">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border-default">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showUpgradeHint && percentage >= 80 && (
        <Link
          href="/settings/billing"
          className="inline-block text-xs text-text-faint underline hover:text-violet-400 transition-colors"
        >
          {tc("upgrade")}
        </Link>
      )}
    </div>
  );
}

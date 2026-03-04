"use client";

import { useTranslations } from "next-intl";
import type { CategoryScore } from "@/lib/analysis/health-scorer";

interface HealthScoreCardProps {
  category: CategoryScore;
}

const CATEGORY_ICONS: Record<string, string> = {
  code_quality: "Q",
  security: "S",
  architecture: "A",
  code_structure: "C",
  learnability: "L",
};

function getScoreColor(score: number) {
  if (score >= 80) return { bar: "bg-green-500", text: "text-green-400", bg: "bg-green-500/10" };
  if (score >= 60) return { bar: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" };
  return { bar: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10" };
}

export function HealthScoreCard({ category }: HealthScoreCardProps) {
  const t = useTranslations("Projects");
  const colors = getScoreColor(category.score);
  const icon = CATEGORY_ICONS[category.category] ?? "?";

  const categoryKey = category.category as
    | "code_quality"
    | "security"
    | "architecture"
    | "code_structure"
    | "learnability";

  return (
    <div className="rounded-xl border border-border-default bg-bg-surface p-4 transition-colors hover:border-border-hover">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.bg} text-sm font-bold ${colors.text}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {t(`health.categories.${categoryKey}`)}
            </p>
            <p className="text-xs text-text-faint">{category.details}</p>
          </div>
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>{category.score}</span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-surface-hover">
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-700`}
          style={{ width: `${category.score}%` }}
        />
      </div>

      {/* Weight indicator */}
      <p className="mt-1.5 text-right text-[10px] text-text-faint">
        {t("health.weight", { weight: Math.round(category.weight * 100) })}
      </p>
    </div>
  );
}

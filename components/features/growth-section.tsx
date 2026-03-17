"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, Brain, Target, BookCheck } from "lucide-react";
import type { GrowthData } from "@/app/api/dashboard/growth/route";

function GrowthStat({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-text-primary tabular-nums">{value}</p>
        <p className="text-xs text-text-faint">{label}</p>
        <p className="text-[11px] text-text-dim">{subtitle}</p>
      </div>
    </div>
  );
}

export function GrowthSection() {
  const t = useTranslations("Dashboard");
  const [data, setData] = useState<GrowthData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/growth")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setData(json.data as GrowthData);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!data) return null;

  // Don't show if user has no learning activity
  if (data.totalModulesCompleted === 0 && data.totalConcepts === 0) return null;

  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          {t("growth.title")}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GrowthStat
          icon={Brain}
          label={t("growth.conceptsMastered")}
          value={`${data.conceptsMastered}/${data.totalConcepts}`}
          subtitle={t("growth.conceptsSubtitle")}
          color="bg-violet-500/10 text-violet-400"
        />
        <GrowthStat
          icon={Target}
          label={t("growth.avgQuizScore")}
          value={data.totalQuizAttempts > 0 ? `${data.avgQuizScore}%` : "-"}
          subtitle={t("growth.quizSubtitle", { count: data.totalQuizAttempts })}
          color="bg-cyan-500/10 text-cyan-400"
        />
        <GrowthStat
          icon={BookCheck}
          label={t("growth.modulesCompleted")}
          value={String(data.totalModulesCompleted)}
          subtitle={t("growth.monthlySubtitle", { count: data.modulesCompletedThisMonth })}
          color="bg-emerald-500/10 text-emerald-400"
        />
      </div>
    </div>
  );
}

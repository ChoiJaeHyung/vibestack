"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, ArrowRight } from "lucide-react";
import { getTechProgressOverview } from "@/server/actions/knowledge-graph";

interface TechProgressProps {
  projectId: string;
}

interface TechData {
  name: string;
  totalConcepts: number;
  masteredConcepts: number;
  avgMastery: number;
  progress: number;
}

interface CrossTechData {
  targetTech: string;
  sourceTech: string;
  readiness: number;
  relation: string;
}

export function TechProgress({ projectId }: TechProgressProps) {
  const t = useTranslations("Dashboard");
  const [technologies, setTechnologies] = useState<TechData[]>([]);
  const [crossTech, setCrossTech] = useState<CrossTechData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTechProgressOverview(projectId)
      .then((r) => {
        setTechnologies(r.technologies);
        setCrossTech(r.crossTechReadiness);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
        <div className="h-4 w-36 rounded skeleton mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 rounded skeleton" />
              <div className="h-2 w-full rounded-full skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (technologies.length === 0) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            {t("techProgress.title")}
          </h2>
        </div>
        <p className="text-sm text-text-faint py-4 text-center">
          {t("techProgress.empty")}
        </p>
      </div>
    );
  }

  // Sort by progress descending
  const sorted = [...technologies].sort((a, b) => b.progress - a.progress);

  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          {t("techProgress.title")}
        </h2>
      </div>
      <p className="text-xs text-text-dim mb-4">{t("techProgress.subtitle")}</p>

      <div className="space-y-3">
        {sorted.map((tech) => {
          const barColor = tech.progress >= 80
            ? "bg-emerald-500"
            : tech.progress >= 40
              ? "bg-violet-500"
              : "bg-blue-500";
          return (
            <div key={tech.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text-secondary">{tech.name}</span>
                <span className="text-[11px] text-text-dim tabular-nums">
                  {t("techProgress.concepts", { mastered: tech.masteredConcepts, total: tech.totalConcepts })}
                </span>
              </div>
              <div className="h-2 rounded-full bg-bg-inset overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${Math.max(tech.progress, 1)}%` }}
                />
              </div>
              <p className="text-[10px] text-text-dim mt-0.5">
                {t("techProgress.avgMastery", { level: Math.round(tech.avgMastery) })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Cross-tech readiness */}
      {crossTech.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-default">
          <div className="space-y-1.5">
            {crossTech.slice(0, 3).map((ct, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-text-dim">{ct.sourceTech}</span>
                <ArrowRight className="h-3 w-3 text-text-dim" />
                <span className="text-text-muted">{ct.targetTech}</span>
                <span className="ml-auto text-emerald-400 tabular-nums font-medium">
                  {Math.round(ct.readiness)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

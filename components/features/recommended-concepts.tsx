"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lightbulb, Network, FileCode } from "lucide-react";
import { getRecommendedNextConcepts } from "@/server/actions/knowledge-graph";

interface RecommendedConceptsProps {
  projectId: string;
}

export function RecommendedConcepts({ projectId }: RecommendedConceptsProps) {
  const t = useTranslations("Dashboard");
  const [recommendations, setRecommendations] = useState<Array<{
    conceptKey: string;
    conceptName: string;
    techName: string;
    effectiveMastery: number;
    readinessScore: number;
    matchedFileCount?: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecommendedNextConcepts(projectId, 3)
      .then((r) => setRecommendations(r.recommendations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // Skeleton
  if (loading) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
        <div className="h-4 w-32 rounded skeleton mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg skeleton" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 rounded skeleton" />
                <div className="h-2 w-full rounded-full skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            {t("recommendedConcepts.title")}
          </h2>
        </div>
        <Link
          href={`/learning/knowledge-map?project=${projectId}`}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
        >
          {t("recommendedConcepts.viewMap")}
          <Network className="h-3 w-3" />
        </Link>
      </div>
      <p className="text-xs text-text-dim mb-4">{t("recommendedConcepts.subtitle")}</p>

      {recommendations.length === 0 ? (
        <p className="text-sm text-text-faint py-4 text-center">
          {t("recommendedConcepts.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const barColor = rec.effectiveMastery >= 60
              ? "bg-emerald-500"
              : rec.effectiveMastery >= 30
                ? "bg-amber-500"
                : "bg-red-500";
            return (
              <div key={rec.conceptKey} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <Lightbulb className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-secondary truncate">{rec.conceptName}</p>
                    <span className="shrink-0 ml-2 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                      {t("recommendedConcepts.readiness", { score: Math.round(rec.readinessScore * 100) })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-dim">{rec.techName}</span>
                    {rec.matchedFileCount != null && rec.matchedFileCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] text-amber-700 dark:text-amber-400">
                        <FileCode className="h-2.5 w-2.5" />
                        {t("recommendedConcepts.filesFound", { count: rec.matchedFileCount })}
                      </span>
                    )}
                    <div className="flex-1 h-1.5 rounded-full bg-bg-inset overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.max(rec.effectiveMastery, 2)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-dim tabular-nums">{Math.round(rec.effectiveMastery)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

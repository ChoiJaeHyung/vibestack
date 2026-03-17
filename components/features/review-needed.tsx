"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, RefreshCw, Network } from "lucide-react";
import { getReviewNeededConcepts, type ReviewNeededConcept } from "@/server/actions/knowledge-graph";

interface ReviewNeededProps {
  projectId: string;
}

export function ReviewNeeded({ projectId }: ReviewNeededProps) {
  const t = useTranslations("Dashboard");
  const [concepts, setConcepts] = useState<ReviewNeededConcept[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReviewNeededConcepts(projectId, 3)
      .then((r) => setConcepts(r.concepts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // Don't render anything if no reviews needed (avoid empty card clutter)
  if (!loading && concepts.length === 0) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
        <div className="h-4 w-32 rounded skeleton mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
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
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            {t("reviewNeeded.title")}
          </h2>
        </div>
        <Link
          href={`/learning/knowledge-map?project=${projectId}`}
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
        >
          {t("reviewNeeded.viewMap")}
          <Network className="h-3 w-3" />
        </Link>
      </div>
      <p className="text-xs text-text-dim mb-4">{t("reviewNeeded.subtitle")}</p>

      <div className="space-y-3">
        {concepts.map((concept) => {
          const decayPercent = concept.rawMastery - concept.effectiveMastery;
          return (
            <div key={concept.conceptKey} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-secondary truncate">
                    {concept.conceptName}
                  </p>
                  <span className="shrink-0 ml-2 text-[10px] text-amber-700 dark:text-amber-400 tabular-nums">
                    -{decayPercent}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-text-dim">{concept.techName}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-bg-inset overflow-hidden">
                    {/* Show decay visually: effective = colored, gap = faded */}
                    <div className="relative h-full w-full">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-amber-500/30"
                        style={{ width: `${concept.rawMastery}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-amber-500 transition-all"
                        style={{ width: `${concept.effectiveMastery}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-text-dim tabular-nums">
                    {t("reviewNeeded.daysAgo", { days: concept.daysSinceReview })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

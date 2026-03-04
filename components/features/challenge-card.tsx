"use client";

import { useTranslations } from "next-intl";
import { Zap, CheckCircle2, SkipForward, Clock } from "lucide-react";
import type { ChallengeItem } from "@/server/actions/refactoring-challenges";

interface ChallengeCardProps {
  challenge: ChallengeItem;
  locale: "ko" | "en";
  onClick: () => void;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-text-muted", bg: "bg-bg-surface-hover" },
  in_progress: { icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
  submitted: { icon: Zap, color: "text-violet-400", bg: "bg-violet-500/10" },
  completed: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
  skipped: { icon: SkipForward, color: "text-text-faint", bg: "bg-bg-surface-hover" },
} as const;

const DIFFICULTY_CONFIG = {
  beginner: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  intermediate: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  advanced: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
} as const;

export function ChallengeCard({ challenge, locale, onClick }: ChallengeCardProps) {
  const t = useTranslations("Projects");
  const statusConfig = STATUS_CONFIG[challenge.status];
  const diffConfig = DIFFICULTY_CONFIG[challenge.difficulty];
  const StatusIcon = statusConfig.icon;

  const missionText = locale === "ko" ? challenge.missionTextKo : challenge.missionTextEn;
  const isClickable = challenge.status !== "completed" && challenge.status !== "skipped";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={`w-full rounded-xl border border-border-default bg-bg-surface p-4 text-left transition-all ${
        isClickable
          ? "hover:border-border-hover hover:bg-bg-surface-hover cursor-pointer"
          : "opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${statusConfig.bg}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${diffConfig.color} ${diffConfig.bg} ${diffConfig.border}`}>
              {t(`challenges.difficulty.${challenge.difficulty}`)}
            </span>
            <span className={`text-[10px] ${statusConfig.color}`}>
              {t(`challenges.status.${challenge.status}`)}
            </span>
          </div>

          <p className="mt-1.5 line-clamp-2 text-sm text-text-primary">
            {missionText}
          </p>

          <div className="mt-2 flex items-center gap-3 text-[10px] text-text-faint">
            <span>{new Date(challenge.createdAt).toLocaleDateString()}</span>
            {challenge.score != null && (
              <span className="font-medium text-text-muted">
                {t("challenges.feedback.score")}: {challenge.score}/100
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

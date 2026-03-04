"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, ArrowLeft, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface FeedbackData {
  score: number;
  feedback_ko: string;
  feedback_en: string;
  correct_parts: string[];
  missing_parts: string[];
  suggestions: string[];
}

interface ChallengeFeedbackProps {
  score: number;
  feedback: FeedbackData;
  locale: "ko" | "en";
  onBack: () => void;
}

function getScoreLabel(score: number, t: (key: string) => string): string {
  if (score >= 90) return t("challenges.feedback.excellent");
  if (score >= 70) return t("challenges.feedback.good");
  if (score >= 50) return t("challenges.feedback.partial");
  return t("challenges.feedback.needsWork");
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 70) return "text-violet-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export function ChallengeFeedback({ score, feedback, locale, onBack }: ChallengeFeedbackProps) {
  const t = useTranslations("Projects");

  // Confetti for high scores
  useEffect(() => {
    if (score >= 70) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
  }, [score]);

  const feedbackText = locale === "ko" ? feedback.feedback_ko : feedback.feedback_en;

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="rounded-2xl border border-border-default bg-bg-elevated p-8 text-center">
        <p className="text-sm text-text-muted">{t("challenges.feedback.scoreTitle")}</p>
        <p className={`mt-2 text-5xl font-bold ${getScoreColor(score)}`}>
          {score}
          <span className="text-lg text-text-faint">/100</span>
        </p>
        <p className={`mt-1 text-sm font-medium ${getScoreColor(score)}`}>
          {getScoreLabel(score, t)}
        </p>
      </div>

      {/* AI Feedback */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-4">
        <p className="text-xs font-medium text-text-muted">{t("challenges.feedback.aiFeedback")}</p>
        <p className="mt-2 text-sm leading-relaxed text-text-primary">{feedbackText}</p>
      </div>

      {/* Correct parts */}
      {feedback.correct_parts.length > 0 && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <p className="text-sm font-medium text-green-400">
              {t("challenges.feedback.correctParts")}
            </p>
          </div>
          <ul className="mt-2 space-y-1">
            {feedback.correct_parts.map((part, idx) => (
              <li key={idx} className="text-xs text-text-primary">
                {part}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing parts */}
      {feedback.missing_parts.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <p className="text-sm font-medium text-red-400">
              {t("challenges.feedback.missingParts")}
            </p>
          </div>
          <ul className="mt-2 space-y-1">
            {feedback.missing_parts.map((part, idx) => (
              <li key={idx} className="text-xs text-text-primary">
                {part}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {feedback.suggestions.length > 0 && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-violet-400" />
            <p className="text-sm font-medium text-violet-400">
              {t("challenges.feedback.suggestions")}
            </p>
          </div>
          <ul className="mt-2 space-y-1">
            {feedback.suggestions.map((s, idx) => (
              <li key={idx} className="text-xs text-text-primary">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Back button */}
      <div className="text-center">
        <Button variant="secondary" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("challenges.feedback.backToList")}
        </Button>
      </div>
    </div>
  );
}

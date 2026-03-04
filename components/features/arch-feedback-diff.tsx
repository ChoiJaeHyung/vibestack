"use client";

import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ChallengeFeedback } from "@/server/actions/architecture";

interface ArchFeedbackDiffProps {
  score: number;
  feedback: ChallengeFeedback;
  onRetry: () => void;
  onClose: () => void;
}

export function ArchFeedbackDiff({
  score,
  feedback,
  onRetry,
  onClose,
}: ArchFeedbackDiffProps) {
  const t = useTranslations("Projects");

  const scoreColor =
    score >= 80
      ? "text-green-500"
      : score >= 50
        ? "text-amber-500"
        : "text-red-400";

  return (
    <div className="rounded-2xl border border-border-default bg-bg-elevated p-6">
      {/* Score */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <Trophy className={`h-10 w-10 ${scoreColor}`} />
        <div className={`text-4xl font-bold ${scoreColor}`}>{score}</div>
        <p className="text-sm text-text-muted">
          {t("architecture.feedback.scoreLabel", {
            correct: feedback.totalCorrect,
            total: feedback.totalQuestions,
          })}
        </p>
      </div>

      {/* Correct answers */}
      {feedback.correct.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            {t("architecture.feedback.correctTitle")}
          </h4>
          <div className="space-y-1">
            {feedback.correct.map((qId) => (
              <div
                key={qId}
                className="rounded-lg bg-green-500/10 px-3 py-1.5 text-sm text-text-secondary"
              >
                {qId}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incorrect answers */}
      {feedback.incorrect.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-400">
            <XCircle className="h-4 w-4" />
            {t("architecture.feedback.incorrectTitle")}
          </h4>
          <div className="space-y-2">
            {feedback.incorrect.map((item) => (
              <div
                key={item.questionId}
                className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">
                    {t("architecture.feedback.yourAnswer")}:{" "}
                    <span className="font-medium text-red-400">
                      {item.userAnswer}
                    </span>
                  </span>
                  <span className="text-text-muted">
                    {t("architecture.feedback.correct")}:{" "}
                    <span className="font-medium text-green-500">
                      {item.correctAnswer}
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-faint">
                  {item.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" />
          {t("architecture.feedback.retry")}
        </Button>
        <Button size="sm" className="flex-1" onClick={onClose}>
          {t("architecture.feedback.done")}
        </Button>
      </div>
    </div>
  );
}

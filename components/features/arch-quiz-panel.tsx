"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { QuizQuestion } from "@/server/actions/architecture";

interface ArchQuizPanelProps {
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  isSubmitting: boolean;
}

export function ArchQuizPanel({
  questions,
  onSubmit,
  isSubmitting,
}: ArchQuizPanelProps) {
  const t = useTranslations("Projects");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const allAnswered = questions.every((q) => answers[q.questionId]);
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.questionId]
    : undefined;

  const handleSelect = (option: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionId]: option,
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) return;
    setCurrentIdx((prev) => prev + 1);
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    onSubmit(answers);
  };

  if (!currentQuestion) return null;

  return (
    <div className="rounded-2xl border border-border-default bg-bg-elevated p-5">
      {/* Progress */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted">
          {t("architecture.quiz.progress", {
            current: currentIdx + 1,
            total: questions.length,
          })}
        </span>
        <div className="flex gap-1">
          {questions.map((q, i) => (
            <div
              key={q.questionId}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                answers[q.questionId]
                  ? "bg-accent-purple"
                  : i === currentIdx
                    ? "bg-accent-purple/40"
                    : "bg-bg-surface-hover"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded bg-accent-purple/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-purple">
            {currentQuestion.type === "missing_node"
              ? t("architecture.quiz.nodeQuestion")
              : t("architecture.quiz.edgeQuestion")}
          </span>
        </div>
        <p className="text-sm font-medium text-text-primary">
          {currentQuestion.prompt}
        </p>
      </div>

      {/* Options */}
      <div className="mb-4 space-y-2">
        {currentQuestion.options.map((option) => {
          const isSelected = currentAnswer === option;
          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
                isSelected
                  ? "border-accent-purple bg-accent-purple/10 text-text-primary"
                  : "border-border-default bg-bg-surface text-text-secondary hover:border-border-hover hover:bg-bg-surface-hover"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isSelected
                    ? "border-accent-purple bg-accent-purple"
                    : "border-border-default"
                }`}
              >
                {isSelected && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              {option}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isLastQuestion ? (
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleNext}
            disabled={!currentAnswer}
          >
            {t("architecture.quiz.next")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
          >
            {isSubmitting ? (
              t("architecture.quiz.submitting")
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                {t("architecture.quiz.submit")}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

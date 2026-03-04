"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Lightbulb,
  Send,
  SkipForward,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import { Button } from "@/components/ui/button";
import {
  submitChallengeAnswer,
  skipChallenge,
} from "@/server/actions/refactoring-challenges";
import { ChallengeFeedback } from "@/components/features/challenge-feedback";
import type { ChallengeItem } from "@/server/actions/refactoring-challenges";

// Register highlight.js languages
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);

interface ChallengeWorkspaceProps {
  challenge: ChallengeItem;
  locale: "ko" | "en";
  onBack: () => void;
  onComplete: () => void;
}

interface FeedbackData {
  score: number;
  feedback_ko: string;
  feedback_en: string;
  correct_parts: string[];
  missing_parts: string[];
  suggestions: string[];
}

export function ChallengeWorkspace({
  challenge,
  locale,
  onBack,
  onComplete,
}: ChallengeWorkspaceProps) {
  const t = useTranslations("Projects");

  const [userCode, setUserCode] = useState("");
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; feedback: FeedbackData } | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState("");

  const missionText = locale === "ko" ? challenge.missionTextKo : challenge.missionTextEn;
  const hints = challenge.hints ?? [];

  // Highlight original code
  useEffect(() => {
    try {
      const result = hljs.highlightAuto(challenge.originalCode);
      setHighlightedCode(result.value);
    } catch {
      setHighlightedCode(challenge.originalCode);
    }
  }, [challenge.originalCode]);

  const handleSubmit = useCallback(async () => {
    if (!userCode.trim()) return;
    setSubmitting(true);

    try {
      const result = await submitChallengeAnswer(challenge.id, userCode);
      if (result.success && result.data) {
        setFeedback({
          score: result.data.score,
          feedback: result.data.feedback as unknown as FeedbackData,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [challenge.id, userCode]);

  const handleSkip = useCallback(async () => {
    await skipChallenge(challenge.id);
    onComplete();
  }, [challenge.id, onComplete]);

  const revealNextHint = () => {
    if (hintsRevealed < hints.length) {
      setHintsRevealed((prev) => prev + 1);
      setShowHints(true);
    }
  };

  // If feedback is shown, render feedback view
  if (feedback) {
    return (
      <ChallengeFeedback
        score={feedback.score}
        feedback={feedback.feedback}
        locale={locale}
        onBack={() => {
          onComplete();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          {t("detail.back")}
        </Button>
        <h2 className="text-lg font-bold text-text-primary">
          {t("challenges.workspace.title")}
        </h2>
      </div>

      {/* Mission */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <p className="text-sm font-medium text-violet-300">{t("challenges.workspace.mission")}</p>
        <p className="mt-1 text-sm text-text-primary">{missionText}</p>
      </div>

      {/* Code panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Original code (read-only) */}
        <div className="rounded-xl border border-border-default bg-bg-elevated">
          <div className="border-b border-border-default px-4 py-2">
            <p className="text-xs font-medium text-text-muted">
              {t("challenges.workspace.originalCode")}
            </p>
          </div>
          <div className="max-h-[400px] overflow-auto p-4">
            <pre className="text-xs leading-relaxed">
              <code
                className="hljs"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            </pre>
          </div>
        </div>

        {/* User code editor */}
        <div className="rounded-xl border border-border-default bg-bg-elevated">
          <div className="border-b border-border-default px-4 py-2">
            <p className="text-xs font-medium text-text-muted">
              {t("challenges.workspace.yourCode")}
            </p>
          </div>
          <div className="p-4">
            <textarea
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              placeholder={t("challenges.workspace.placeholder")}
              className="h-[360px] w-full resize-none rounded-lg border border-border-default bg-bg-surface p-3 font-mono text-xs text-text-primary placeholder:text-text-faint focus:border-violet-500/40 focus:outline-none"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Hints section */}
      {hints.length > 0 && (
        <div className="rounded-xl border border-border-default bg-bg-surface p-4">
          <button
            type="button"
            onClick={() => setShowHints(!showHints)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-text-primary">
                {t("challenges.workspace.hints")} ({hintsRevealed}/{hints.length})
              </span>
            </div>
            {showHints ? (
              <ChevronUp className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            )}
          </button>

          {showHints && (
            <div className="mt-3 space-y-2">
              {hints.slice(0, hintsRevealed).map((hint, idx) => (
                <div key={idx} className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                  <p className="text-xs text-text-muted">
                    {t("challenges.workspace.hintLevel", { level: hint.level })}
                  </p>
                  <p className="mt-0.5 text-sm text-text-primary">
                    {locale === "ko" ? hint.text_ko : hint.text_en}
                  </p>
                </div>
              ))}
              {hintsRevealed < hints.length && (
                <Button variant="ghost" size="sm" onClick={revealNextHint} className="gap-1.5">
                  <Lightbulb className="h-3 w-3" />
                  {t("challenges.workspace.revealHint")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="gap-1.5 text-text-muted">
            <SkipForward className="h-3.5 w-3.5" />
            {t("challenges.workspace.skip")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReference(!showReference)}
            className="gap-1.5 text-text-muted"
          >
            <Eye className="h-3.5 w-3.5" />
            {t("challenges.workspace.showAnswer")}
          </Button>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !userCode.trim()}
          className="gap-1.5"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {submitting ? t("challenges.workspace.submitting") : t("challenges.workspace.submit")}
        </Button>
      </div>

      {/* Reference answer (spoiler) */}
      {showReference && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="mb-2 text-xs font-medium text-amber-400">
            {t("challenges.workspace.referenceAnswer")}
          </p>
          <pre className="overflow-x-auto rounded-lg bg-bg-elevated p-3 text-xs text-text-primary">
            <code>{challenge.originalCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

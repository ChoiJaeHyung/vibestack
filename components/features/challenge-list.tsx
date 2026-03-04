"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getChallenges,
  generateChallenge,
  type ChallengeItem,
} from "@/server/actions/refactoring-challenges";
import { ChallengeCard } from "@/components/features/challenge-card";
import { ChallengeWorkspace } from "@/components/features/challenge-workspace";

interface ChallengeListProps {
  projectId: string;
  locale: "ko" | "en";
}

export function ChallengeList({ projectId, locale }: ChallengeListProps) {
  const t = useTranslations("Projects");

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadChallenges = useCallback(() => {
    getChallenges(projectId).then((result) => {
      if (result.success && result.data) {
        setChallenges(result.data);
      }
      setLoading(false);
    });
  }, [projectId]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const handleGenerate = async (difficulty: "beginner" | "intermediate" | "advanced" = "intermediate") => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateChallenge(projectId, difficulty);
      if (result.success && result.data) {
        setChallenges((prev) => [result.data!, ...prev]);
        setActiveChallenge(result.data);
      } else {
        setError(result.error ?? "Failed to generate challenge");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = () => {
    setActiveChallenge(null);
    loadChallenges();
  };

  // Show workspace if a challenge is active
  if (activeChallenge) {
    return (
      <ChallengeWorkspace
        challenge={activeChallenge}
        locale={locale}
        onBack={() => setActiveChallenge(null)}
        onComplete={handleComplete}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Generate buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleGenerate("beginner")}
          disabled={generating}
          className="gap-1.5"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {t("challenges.difficulty.beginner")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleGenerate("intermediate")}
          disabled={generating}
          className="gap-1.5"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {t("challenges.difficulty.intermediate")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleGenerate("advanced")}
          disabled={generating}
          className="gap-1.5"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {t("challenges.difficulty.advanced")}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Challenge list */}
      {challenges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="mx-auto h-8 w-8 text-text-faint" />
            <p className="mt-3 text-sm text-text-muted">{t("challenges.empty")}</p>
            <p className="mt-1 text-xs text-text-faint">{t("challenges.emptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              locale={locale}
              onClick={() => setActiveChallenge(challenge)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

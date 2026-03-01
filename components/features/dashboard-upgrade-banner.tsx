"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles, Zap, ArrowRight } from "lucide-react";

const STORAGE_KEY = "vibeuniv-upgrade-banner-dismissed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface DashboardUpgradeBannerProps {
  planType: string;
}

export function DashboardUpgradeBanner({
  planType,
}: DashboardUpgradeBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (planType !== "free") return;

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < SEVEN_DAYS_MS) return;
    }

    // Client-only initialization from localStorage — safe to setState here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, [planType]);

  if (!visible) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setVisible(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/[0.08] via-violet-500/[0.04] to-cyan-500/[0.08] p-5">
      {/* Animated glow blob */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" style={{ animation: "glow-pulse 3s ease-in-out infinite" }} />
      <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-cyan-500/15 blur-3xl" style={{ animation: "glow-pulse 3s ease-in-out infinite 1.5s" }} />

      <div className="relative flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-glow-purple-sm">
          <Zap className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">
            Pro로 업그레이드
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            무제한 프로젝트 분석, AI 대화, 학습 로드맵으로 더 빠르게 성장하세요
          </p>
          <Link
            href="/settings/billing"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-glow-purple-sm transition-all hover:shadow-glow-purple hover:scale-[1.01]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Pro 시작하기
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-text-faint hover:text-text-tertiary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

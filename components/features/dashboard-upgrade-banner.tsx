"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";

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
    <div className="relative flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />

      <div className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
        <p>
          Pro로 업그레이드하면 무제한 프로젝트 분석, AI 대화, 학습 로드맵을
          이용할 수 있어요
        </p>
        <Link
          href="/settings/billing"
          className="mt-2 inline-block rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Pro 시작하기
        </Link>
      </div>

      <button
        onClick={handleDismiss}
        className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

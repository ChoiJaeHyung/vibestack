"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Zap, Check } from "lucide-react";
import { createCheckoutSession } from "@/server/actions/billing";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: "analysis" | "learning" | "chat";
}

const FEATURE_MESSAGES: Record<UpgradeModalProps["feature"], string> = {
  analysis: "프로젝트 등록 한도에 도달했어요",
  learning: "이번 달 학습 로드맵 생성 한도에 도달했어요",
  chat: "이번 달 AI 대화 한도에 도달했어요",
};

const PRO_BENEFITS = [
  "무제한 프로젝트 분석",
  "무제한 학습 로드맵",
  "무제한 AI 대화",
  "심화 분석 리포트",
  "BYOK (자체 LLM 키)",
];

export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleUpgrade() {
    setLoading(true);
    try {
      const result = await createCheckoutSession("pro");
      if (result.success && result.url) {
        router.push(result.url);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Zap className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            업그레이드가 필요해요
          </h2>
        </div>

        <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">
          {FEATURE_MESSAGES[feature]}
        </p>

        <ul className="mb-6 space-y-2">
          {PRO_BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <Check className="h-4 w-4 shrink-0 text-zinc-500" />
              {benefit}
            </li>
          ))}
        </ul>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "처리 중..." : "Pro 시작하기 — $19/mo"}
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          나중에
        </button>
      </div>
    </div>
  );
}

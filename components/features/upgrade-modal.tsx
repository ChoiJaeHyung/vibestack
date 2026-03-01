"use client";

import { useState } from "react";
import { X, Zap, Check } from "lucide-react";
import { createPaymentRequest } from "@/server/actions/billing";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    try {
      const result = await createPaymentRequest("pro");
      if (!result.success || !result.data) {
        setError(result.error ?? "결제 요청을 생성할 수 없습니다.");
        return;
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        setError("결제 설정이 올바르지 않습니다.");
        return;
      }

      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({
        customerKey: result.data.customerKey,
      });

      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: result.data.amount,
        },
        orderId: result.data.orderId,
        orderName: result.data.orderName,
        successUrl: `${window.location.origin}/settings/billing?orderId=${result.data.orderId}`,
        failUrl: `${window.location.origin}/settings/billing?canceled=true`,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "USER_CANCEL" && code !== "INVALID_REQUEST") {
        setError("결제 창을 열 수 없습니다.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border-default bg-bg-elevated p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
            <Zap className="h-5 w-5 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            업그레이드가 필요해요
          </h2>
        </div>

        <p className="mb-5 text-sm text-text-muted">
          {FEATURE_MESSAGES[feature]}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <ul className="mb-6 space-y-2">
          {PRO_BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-2 text-sm text-text-tertiary"
            >
              <Check className="h-4 w-4 shrink-0 text-green-400" />
              {benefit}
            </li>
          ))}
        </ul>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-glow-purple-sm transition-all hover:shadow-glow-purple hover:scale-[1.01] disabled:opacity-50"
        >
          {loading ? "처리 중..." : "Pro 시작하기 — ₩25,000/월"}
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-text-faint hover:text-text-tertiary transition-colors"
        >
          나중에
        </button>
      </div>
    </div>
  );
}

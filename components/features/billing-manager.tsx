"use client";

import { useState } from "react";
import { Loader2, ExternalLink, CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession, createPortalSession } from "@/server/actions/billing";
import { invalidateCache } from "@/lib/hooks/use-cached-fetch";

interface BillingManagerProps {
  currentPlan: string;
}

export function BillingManager({ currentPlan }: BillingManagerProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);

  async function handleCheckout(plan: "pro" | "team") {
    setLoadingPlan(plan);
    setError(null);

    try {
      const result = await createCheckoutSession(plan);
      if (result.success && result.url) {
        invalidateCache();
        window.location.href = result.url;
      } else {
        setError(result.error ?? "결제 세션을 생성할 수 없습니다.");
        setLoadingPlan(null);
      }
    } catch {
      setError("예기치 않은 오류가 발생했습니다.");
      setLoadingPlan(null);
    }
  }

  async function handlePortalClick() {
    if (isPaid) {
      setShowDowngradeWarning(true);
      return;
    }
    await handlePortal();
  }

  async function handlePortal() {
    setShowDowngradeWarning(false);
    setLoadingPlan("portal");
    setError(null);

    try {
      const result = await createPortalSession();
      if (result.success && result.url) {
        invalidateCache();
        window.location.href = result.url;
      } else {
        setError(result.error ?? "구독 관리 포털을 열 수 없습니다.");
        setLoadingPlan(null);
      }
    } catch {
      setError("예기치 않은 오류가 발생했습니다.");
      setLoadingPlan(null);
    }
  }

  const isPaid = currentPlan === "pro" || currentPlan === "team";

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free Plan */}
        <PlanCard
          name="Free"
          price="$0"
          period="/mo"
          features={[
            "프로젝트 3개",
            "기본 기술 스택 분석",
            "월 1회 학습 로드맵",
            "월 20회 AI 대화",
          ]}
          isCurrent={currentPlan === "free"}
          ctaLabel={currentPlan === "free" ? "현재 플랜" : "무료로 시작하기"}
          ctaDisabled={currentPlan === "free"}
          loading={false}
        />

        {/* Pro Plan */}
        <PlanCard
          name="Pro"
          price="$19"
          period="/mo"
          features={[
            "무제한 프로젝트",
            "심화 분석",
            "무제한 학습 로드맵",
            "무제한 AI 대화",
            "BYOK (자체 LLM 키)",
          ]}
          isCurrent={currentPlan === "pro"}
          isPopular
          ctaLabel={
            currentPlan === "pro"
              ? "현재 플랜"
              : currentPlan === "team"
                ? "다운그레이드"
                : "Pro 시작하기"
          }
          ctaDisabled={currentPlan === "pro"}
          loading={loadingPlan === "pro"}
          onCtaClick={() => handleCheckout("pro")}
        />

        {/* Team Plan */}
        <PlanCard
          name="Team"
          price="$49"
          period="/mo"
          features={[
            "Pro 전체 기능",
            "팀 프로젝트 공유",
            "팀 학습 대시보드",
            "우선 지원",
          ]}
          isCurrent={currentPlan === "team"}
          ctaLabel={currentPlan === "team" ? "현재 플랜" : "Team 시작하기"}
          ctaDisabled={currentPlan === "team"}
          loading={loadingPlan === "team"}
          onCtaClick={() => handleCheckout("team")}
        />
      </div>

      {/* Manage Subscription Button */}
      {isPaid && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <Button
              variant="secondary"
              onClick={handlePortalClick}
              disabled={loadingPlan === "portal"}
            >
              {loadingPlan === "portal" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              구독 관리
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>

          {/* Downgrade Warning */}
          {showDowngradeWarning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Free 플랜으로 변경하면 다음 제한이 적용됩니다:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-amber-700 dark:text-amber-400">
                    <li>프로젝트 3개</li>
                    <li>월 1회 학습 로드맵</li>
                    <li>월 20회 AI 대화</li>
                  </ul>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    현재 한도를 초과한 데이터는 읽기 전용이 됩니다.
                  </p>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    계속하시겠습니까?
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handlePortal}
                      disabled={loadingPlan === "portal"}
                    >
                      {loadingPlan === "portal" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      확인
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDowngradeWarning(false)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  features,
  isCurrent,
  isPopular,
  ctaLabel,
  ctaDisabled,
  loading,
  onCtaClick,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  isCurrent: boolean;
  isPopular?: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
  loading: boolean;
  onCtaClick?: () => void;
}) {
  return (
    <div
      className={`relative rounded-xl border p-6 ${
        isPopular
          ? "border-zinc-900 shadow-lg dark:border-zinc-100"
          : "border-zinc-200 dark:border-zinc-800"
      } ${isCurrent ? "bg-zinc-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-950"}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            인기
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
            현재 플랜
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {name}
        </h3>
        <div className="mt-2 flex items-baseline">
          <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {price}
          </span>
          <span className="ml-1 text-sm text-zinc-500 dark:text-zinc-400">
            {period}
          </span>
        </div>
      </div>

      <ul className="mb-6 space-y-2">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
          >
            <svg
              className="h-4 w-4 flex-shrink-0 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <Button
        className="w-full"
        variant={isPopular ? "primary" : "secondary"}
        disabled={ctaDisabled || loading}
        onClick={onCtaClick}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {ctaLabel}
      </Button>
    </div>
  );
}

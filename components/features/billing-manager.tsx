"use client";

import { useState, useEffect } from "react";
import { Loader2, CreditCard, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createPaymentRequest,
  cancelSubscription,
  getPaymentHistory,
} from "@/server/actions/billing";
import { invalidateCache } from "@/lib/hooks/use-cached-fetch";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

interface BillingManagerProps {
  currentPlan: string;
  hasBillingKey: boolean;
}

interface PaymentRecord {
  id: string;
  order_id: string;
  plan: string;
  amount: number;
  status: string;
  method: string | null;
  is_recurring: boolean;
  created_at: string;
}

export function BillingManager({ currentPlan, hasBillingKey }: BillingManagerProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isPaid = currentPlan === "pro" || currentPlan === "team";

  useEffect(() => {
    if (isPaid) {
      loadPaymentHistory();
    }
  }, [isPaid]);

  async function loadPaymentHistory() {
    setLoadingHistory(true);
    try {
      const result = await getPaymentHistory();
      if (result.success && result.data) {
        setPayments(result.data);
      }
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleCheckout(plan: "pro" | "team") {
    setLoadingPlan(plan);
    setError(null);

    try {
      const result = await createPaymentRequest(plan);
      if (!result.success || !result.data) {
        setError(result.error ?? "결제 요청을 생성할 수 없습니다.");
        setLoadingPlan(null);
        return;
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        setError("결제 설정이 올바르지 않습니다.");
        setLoadingPlan(null);
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
      // 사용자가 결제창을 닫은 경우 에러 표시하지 않음
      const code = (err as { code?: string })?.code;
      if (code !== "USER_CANCEL" && code !== "INVALID_REQUEST") {
        setError("결제 창을 열 수 없습니다.");
      }
      setLoadingPlan(null);
    }
  }

  async function handleCancel() {
    setShowCancelWarning(false);
    setLoadingPlan("cancel");
    setError(null);

    try {
      const result = await cancelSubscription();
      if (result.success) {
        invalidateCache();
        window.location.reload();
      } else {
        setError(result.error ?? "구독 취소에 실패했습니다.");
        setLoadingPlan(null);
      }
    } catch {
      setError("예기치 않은 오류가 발생했습니다.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free Plan */}
        <PlanCard
          name="Free"
          price="₩0"
          period="/월"
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
          price="₩25,000"
          period="/월"
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
          price="₩59,000"
          period="/월"
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

      {/* Subscription Management */}
      {isPaid && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">
              구독 관리
            </h3>

            <div className="space-y-3">
              {hasBillingKey && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <CreditCard className="h-4 w-4" />
                    <span>자동결제 등록됨</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowCancelWarning(true)}
                    disabled={loadingPlan === "cancel"}
                  >
                    {loadingPlan === "cancel" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    구독 취소
                  </Button>
                </div>
              )}

              {!hasBillingKey && (
                <p className="text-sm text-text-muted">
                  자동결제가 등록되어 있지 않습니다. 만료일 이후 Free 플랜으로 전환됩니다.
                </p>
              )}
            </div>

            {/* Cancel Warning */}
            {showCancelWarning && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-amber-300">
                      Free 플랜으로 변경하면 다음 제한이 적용됩니다:
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-amber-400">
                      <li>프로젝트 3개</li>
                      <li>월 1회 학습 로드맵</li>
                      <li>월 20회 AI 대화</li>
                    </ul>
                    <p className="text-sm text-amber-400">
                      현재 구독 기간이 끝날 때까지는 기존 플랜이 유지됩니다.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCancel}
                        disabled={loadingPlan === "cancel"}
                      >
                        {loadingPlan === "cancel" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        확인
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCancelWarning(false)}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="rounded-2xl border border-border-default overflow-hidden">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-text-primary">
                결제 내역
              </h3>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                </div>
              ) : payments.length === 0 ? (
                <p className="text-sm text-text-muted">
                  결제 내역이 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {payments
                    .filter((p) => p.status === "done")
                    .map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-xl border border-border-default px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} Plan
                          </p>
                          <p className="text-xs text-text-muted">
                            {new Date(payment.created_at).toLocaleDateString("ko-KR")}
                            {payment.method ? ` · ${payment.method}` : ""}
                            {payment.is_recurring ? " · 자동결제" : ""}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-text-primary">
                          ₩{payment.amount.toLocaleString("ko-KR")}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
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
      className={`relative rounded-2xl border p-6 transition-all duration-300 ${
        isCurrent
          ? "border-violet-500/40 bg-violet-500/5"
          : isPopular
            ? "border-border-hover bg-bg-surface hover:shadow-glow-card-purple"
            : "border-border-default bg-bg-surface hover:border-border-hover"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-3 py-1 text-xs font-medium text-white">
            인기
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-3 py-1 text-xs font-medium text-violet-300">
            현재 플랜
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          {name}
        </h3>
        <div className="mt-2 flex items-baseline">
          <span className="text-3xl font-bold text-text-primary">
            {price}
          </span>
          <span className="ml-1 text-sm text-text-muted">
            {period}
          </span>
        </div>
      </div>

      <ul className="mb-6 space-y-2">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2 text-sm text-text-muted"
          >
            <svg
              className="h-4 w-4 flex-shrink-0 text-green-400"
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

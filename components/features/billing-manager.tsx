"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CreditCard, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createPaymentRequest,
  cancelSubscription,
  getPaymentHistory,
} from "@/server/actions/billing";
import { invalidateCache } from "@/lib/hooks/use-cached-fetch";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { translateError } from "@/lib/utils/translate-error";

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
  const t = useTranslations("Billing");
  const tc = useTranslations("Common");
  const te = useTranslations("Errors");
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
        setError(result.error ? translateError(result.error, te) : t("error.paymentRequest"));
        setLoadingPlan(null);
        return;
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        setError(t("error.paymentConfig"));
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
        setError(t("error.paymentWindow"));
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
        setError(result.error ? translateError(result.error, te) : t("error.cancelFailed"));
        setLoadingPlan(null);
      }
    } catch {
      setError(t("error.unexpected"));
      setLoadingPlan(null);
    }
  }

  const freeFeatures = [
    t("plan.free.features.projects"),
    t("plan.free.features.analysis"),
    t("plan.free.features.learningPaths"),
    t("plan.free.features.aiChats"),
  ];

  const proFeatures = [
    t("plan.pro.features.projects"),
    t("plan.pro.features.analysis"),
    t("plan.pro.features.learningPaths"),
    t("plan.pro.features.aiChats"),
    t("plan.pro.features.byok"),
  ];

  const teamFeatures = [
    t("plan.team.features.pro"),
    t("plan.team.features.share"),
    t("plan.team.features.dashboard"),
    t("plan.team.features.support"),
  ];

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
          period={t("plan.perMonth")}
          features={freeFeatures}
          isCurrent={currentPlan === "free"}
          currentPlanLabel={t("plan.currentPlan")}
          popularLabel={t("plan.popular")}
          ctaLabel={currentPlan === "free" ? t("plan.currentPlan") : t("plan.free.cta")}
          ctaDisabled={currentPlan === "free"}
          loading={false}
        />

        {/* Pro Plan */}
        <PlanCard
          name="Pro"
          price="₩25,000"
          period={t("plan.perMonth")}
          features={proFeatures}
          isCurrent={currentPlan === "pro"}
          isPopular
          currentPlanLabel={t("plan.currentPlan")}
          popularLabel={t("plan.popular")}
          ctaLabel={
            currentPlan === "pro"
              ? t("plan.currentPlan")
              : currentPlan === "team"
                ? t("plan.pro.downgrade")
                : t("plan.pro.cta")
          }
          ctaDisabled={currentPlan === "pro"}
          loading={loadingPlan === "pro"}
          onCtaClick={() => handleCheckout("pro")}
        />

        {/* Team Plan */}
        <PlanCard
          name="Team"
          price="₩59,000"
          period={t("plan.perMonth")}
          features={teamFeatures}
          isCurrent={currentPlan === "team"}
          currentPlanLabel={t("plan.currentPlan")}
          popularLabel={t("plan.popular")}
          ctaLabel={currentPlan === "team" ? t("plan.currentPlan") : t("plan.team.cta")}
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
              {t("subscriptionManagement.title")}
            </h3>

            <div className="space-y-3">
              {hasBillingKey && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <CreditCard className="h-4 w-4" />
                    <span>{t("subscriptionManagement.autoPayment")}</span>
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
                    {t("subscriptionManagement.cancelSubscription")}
                  </Button>
                </div>
              )}

              {!hasBillingKey && (
                <p className="text-sm text-text-muted">
                  {t("subscriptionManagement.noAutoPayment")}
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
                      {t("subscriptionManagement.cancelWarning.title")}
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-amber-400">
                      <li>{t("subscriptionManagement.cancelWarning.projects")}</li>
                      <li>{t("subscriptionManagement.cancelWarning.learningPaths")}</li>
                      <li>{t("subscriptionManagement.cancelWarning.aiChats")}</li>
                    </ul>
                    <p className="text-sm text-amber-400">
                      {t("subscriptionManagement.cancelWarning.notice")}
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
                        {tc("confirm")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCancelWarning(false)}
                      >
                        {tc("cancel")}
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
                {t("paymentHistory.title")}
              </h3>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                </div>
              ) : payments.length === 0 ? (
                <p className="text-sm text-text-muted">
                  {t("paymentHistory.noHistory")}
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
                            {payment.is_recurring ? ` · ${t("paymentHistory.autoPayment")}` : ""}
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
  currentPlanLabel,
  popularLabel,
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
  currentPlanLabel: string;
  popularLabel: string;
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
            {popularLabel}
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-3 py-1 text-xs font-medium text-violet-300">
            {currentPlanLabel}
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

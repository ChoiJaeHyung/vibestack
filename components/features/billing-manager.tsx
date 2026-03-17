"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createCheckoutSession,
  createPortalSession,
  getPaymentHistory,
} from "@/server/actions/billing";
import { translateError } from "@/lib/utils/translate-error";

interface BillingManagerProps {
  currentPlan: string;
  hasSubscription: boolean;
}

interface PaymentRecord {
  id: string;
  order_id: string;
  plan: string;
  amount: number;
  status: string;
  method: string | null;
  is_recurring: boolean;
  currency: string;
  created_at: string;
}

export function BillingManager({ currentPlan, hasSubscription }: BillingManagerProps) {
  const t = useTranslations("Billing");
  const te = useTranslations("Errors");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

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

  async function handleCheckout(plan: "pro" | "pro-annual" | "team") {
    setLoadingPlan(plan);
    setError(null);

    try {
      const result = await createCheckoutSession(plan);
      if (!result.success || !result.data?.url) {
        setError(result.error ? translateError(result.error, te) : t("error.paymentRequest"));
        setLoadingPlan(null);
        return;
      }

      // Stripe Checkout 페이지로 리다이렉트
      window.location.href = result.data.url;
    } catch {
      setError(t("error.unexpected"));
      setLoadingPlan(null);
    }
  }

  async function handleManageSubscription() {
    setLoadingPlan("manage");
    setError(null);

    try {
      const result = await createPortalSession();
      if (!result.success || !result.data?.url) {
        setError(result.error ? translateError(result.error, te) : t("error.unexpected"));
        setLoadingPlan(null);
        return;
      }

      // Stripe Customer Portal로 리다이렉트
      window.location.href = result.data.url;
    } catch {
      setError(t("error.unexpected"));
      setLoadingPlan(null);
    }
  }

  function formatAmount(amount: number, currency: string) {
    if (currency === "usd" || currency === "USD") {
      return `$${(amount / 100).toFixed(0)}`;
    }
    return `${amount.toLocaleString()} ${currency.toUpperCase()}`;
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

      {/* Billing Period Toggle */}
      {currentPlan === "free" && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              billingPeriod === "monthly"
                ? "bg-violet-500/10 text-violet-400 border border-violet-500/30"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t("plan.monthly")}
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              billingPeriod === "annual"
                ? "bg-violet-500/10 text-violet-400 border border-violet-500/30"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t("plan.annual")}
            <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">
              {t("plan.savePercent")}
            </span>
          </button>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free Plan */}
        <PlanCard
          name="Free"
          price="$0"
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
          price={billingPeriod === "annual" ? "$190" : "$19"}
          period={billingPeriod === "annual" ? t("plan.perYear") : t("plan.perMonth")}
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
          loading={loadingPlan === "pro" || loadingPlan === "pro-annual"}
          onCtaClick={() => handleCheckout(billingPeriod === "annual" ? "pro-annual" : "pro")}
          annualNote={billingPeriod === "annual" ? t("plan.annualSaveNote") : undefined}
        />

        {/* Team Plan — Coming Soon */}
        <PlanCard
          name="Team"
          price="$45"
          period={t("plan.perMonth")}
          features={teamFeatures}
          isCurrent={currentPlan === "team"}
          currentPlanLabel={t("plan.currentPlan")}
          popularLabel={t("plan.popular")}
          ctaLabel={t("plan.team.cta")}
          ctaDisabled
          loading={false}
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
              {hasSubscription ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <CreditCard className="h-4 w-4" />
                    <span>{t("subscriptionManagement.activeSubscription")}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={loadingPlan === "manage"}
                  >
                    {loadingPlan === "manage" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    {t("subscriptionManagement.manage")}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  {t("subscriptionManagement.noSubscription")}
                </p>
              )}
            </div>
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
                            {new Date(payment.created_at).toLocaleDateString()}
                            {payment.method ? ` · ${payment.method}` : ""}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-text-primary">
                          {formatAmount(payment.amount, payment.currency)}
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
  annualNote,
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
  annualNote?: string;
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
        {annualNote && (
          <p className="mt-1 text-xs text-green-400 font-medium">{annualNote}</p>
        )}
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

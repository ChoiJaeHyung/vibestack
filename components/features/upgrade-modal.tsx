"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Zap, Check } from "lucide-react";
import { createCheckoutSession } from "@/server/actions/billing";
import { analytics } from "@/lib/utils/analytics";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: "analysis" | "learning" | "chat";
}

export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  const t = useTranslations("Billing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) analytics.upgradeModalView(feature);
  }, [isOpen, feature]);

  if (!isOpen) return null;

  const featureMessage = t(`upgrade.feature.${feature}`);

  const proBenefits = [
    t("upgrade.benefits.analysis"),
    t("upgrade.benefits.learningPaths"),
    t("upgrade.benefits.aiChats"),
    t("upgrade.benefits.report"),
    t("upgrade.benefits.byok"),
  ];

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    try {
      analytics.upgradeClick(feature);
      const result = await createCheckoutSession("pro");
      if (!result.success || !result.data?.url) {
        setError(result.error ?? t("error.paymentRequest"));
        return;
      }

      // Stripe Checkout 페이지로 리다이렉트
      window.location.href = result.data.url;
    } catch {
      setError(t("error.unexpected"));
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
            {t("upgrade.title")}
          </h2>
        </div>

        <p className="mb-5 text-sm text-text-muted">
          {featureMessage}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <ul className="mb-6 space-y-2">
          {proBenefits.map((benefit) => (
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
          {loading ? t("upgrade.processing") : t("upgrade.cta")}
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-text-faint hover:text-text-tertiary transition-colors"
        >
          {t("upgrade.later")}
        </button>
      </div>
    </div>
  );
}

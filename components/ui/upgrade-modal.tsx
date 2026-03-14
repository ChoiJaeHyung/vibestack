"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/server/actions/billing";
import { analytics } from "@/lib/utils/analytics";

interface UpgradeModalProps {
  trigger: "analysis" | "learning" | "chat";
  onClose: () => void;
}

export function UpgradeModal({ trigger, onClose }: UpgradeModalProps) {
  const t = useTranslations("Billing");
  const [loading, setLoading] = useState(false);

  const benefits = [
    t("upgrade.benefits.analysis"),
    t("upgrade.benefits.learningPaths"),
    t("upgrade.benefits.aiChats"),
    t("upgrade.benefits.report"),
    t("upgrade.benefits.byok"),
  ];

  async function handleUpgrade() {
    setLoading(true);
    analytics.upgradeClick(trigger);
    try {
      const result = await createCheckoutSession("pro");
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch {
      // Billing page fallback
      window.location.href = "/settings/billing";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-border-default bg-bg-primary p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <Sparkles className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 id="upgrade-modal-title" className="text-lg font-bold text-text-primary">
              {t("upgrade.title")}
            </h2>
            <p className="text-sm text-text-muted">
              {t(`upgrade.feature.${trigger}`)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4 mb-5">
          <ul className="space-y-2.5">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Check className="h-4 w-4 text-violet-400 shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? t("upgrade.processing") : t("upgrade.cta")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t("upgrade.later")}
          </Button>
        </div>
      </div>
    </div>
  );
}

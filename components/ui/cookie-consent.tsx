"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";

export function CookieConsent() {
  const t = useTranslations("Common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "essential-only");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border-default bg-bg-primary/95 backdrop-blur-lg p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 mt-0.5 text-violet-500 shrink-0" />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-text-secondary leading-relaxed">
              {t("cookieConsent.message")}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={accept}
                className="rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                {t("cookieConsent.accept")}
              </button>
              <button
                onClick={decline}
                className="rounded-lg border border-border-default px-4 py-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                {t("cookieConsent.decline")}
              </button>
              <a
                href="/privacy"
                className="text-xs text-text-muted underline underline-offset-4 hover:text-text-primary transition-colors"
              >
                {t("cookieConsent.learnMore")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

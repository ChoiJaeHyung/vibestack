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
    <div className="fixed bottom-4 left-4 right-4 z-[45] lg:left-[272px] lg:right-[436px]">
      <div className="mx-auto max-w-2xl rounded-xl border border-border-default bg-bg-primary shadow-lg p-4 backdrop-blur-lg">
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <Shield className="h-4 w-4 text-violet-500 shrink-0 hidden sm:block" />
          <p className="text-xs text-text-muted leading-relaxed flex-1 min-w-0">
            {t("cookieConsent.message")}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={accept}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              {t("cookieConsent.accept")}
            </button>
            <button
              onClick={decline}
              className="rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              {t("cookieConsent.decline")}
            </button>
            <a
              href="/privacy"
              className="text-xs text-text-muted underline underline-offset-4 hover:text-text-primary transition-colors hidden sm:inline"
            >
              {t("cookieConsent.learnMore")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

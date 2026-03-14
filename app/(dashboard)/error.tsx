"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  useEffect(() => {
    console.error("[dashboard-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-text-primary">
        {t("unexpected")}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-text-muted">
        {t("tryAgain")}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          {t("retry")}
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-bg-input px-5 py-2.5 text-sm font-medium text-text-tertiary hover:bg-bg-surface-hover transition-colors"
        >
          <Home className="h-4 w-4" />
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}

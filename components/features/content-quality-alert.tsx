"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { getContentQualityAlerts } from "@/server/actions/feedback-aggregation";

interface ContentQualityAlertProps {
  learningPathId: string;
}

interface AlertData {
  moduleTitle: string;
  negativeCount: number;
}

export function ContentQualityAlert({ learningPathId }: ContentQualityAlertProps) {
  const t = useTranslations("Learning");
  const [alert, setAlert] = useState<AlertData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getContentQualityAlerts(learningPathId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data && result.data.length > 0) {
        setAlert({
          moduleTitle: result.data[0].moduleTitle,
          negativeCount: result.data[0].negativeCount,
        });
      }
    });
    return () => { cancelled = true; };
  }, [learningPathId]);

  if (!alert) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-300">
          {t("feedbackAlert.title")}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {t("feedbackAlert.description", {
            count: alert.negativeCount,
            module: alert.moduleTitle,
          })}
        </p>
      </div>
    </div>
  );
}

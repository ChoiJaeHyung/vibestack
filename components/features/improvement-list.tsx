"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Info, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImprovementItem } from "@/lib/analysis/health-scorer";

interface ImprovementListProps {
  items: ImprovementItem[];
  onStartChallenge?: (item: ImprovementItem) => void;
}

const SEVERITY_CONFIG = {
  important: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "important",
  },
  warning: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "warning",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "info",
  },
} as const;

export function ImprovementList({ items, onStartChallenge }: ImprovementListProps) {
  const t = useTranslations("Projects");

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 text-center">
        <p className="text-sm font-medium text-green-400">
          {t("health.improvements.emptyState")}
        </p>
      </div>
    );
  }

  // Sort: important first, then warning, then info
  const sorted = [...items].sort((a, b) => {
    const order = { important: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });

  return (
    <div className="space-y-3">
      {sorted.map((item, idx) => {
        const config = SEVERITY_CONFIG[item.severity];
        const Icon = config.icon;

        return (
          <div
            key={`${item.category}-${idx}`}
            className={`rounded-xl border ${config.border} ${config.bg} p-4`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium uppercase ${config.color}`}>
                    {t(`health.severity.${config.label}`)}
                  </span>
                  <span className="text-[10px] text-text-faint">{item.category}</span>
                </div>
                <p className="mt-1 text-sm text-text-primary">{item.description}</p>
                <p className="mt-1 text-xs text-text-muted">{item.suggestion}</p>

                {item.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.files.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="rounded bg-bg-surface-hover px-1.5 py-0.5 font-mono text-[10px] text-text-faint"
                      >
                        {f}
                      </span>
                    ))}
                    {item.files.length > 3 && (
                      <span className="text-[10px] text-text-faint">
                        +{item.files.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {onStartChallenge && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => onStartChallenge(item)}
                >
                  <Zap className="h-3 w-3" />
                  {t("health.improvements.startChallenge")}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

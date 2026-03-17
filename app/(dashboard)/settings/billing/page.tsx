import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentPlan } from "@/server/actions/billing";
import { getUsageData } from "@/server/actions/usage";
import type { UsageData } from "@/server/actions/usage";
import { BillingManager } from "@/components/features/billing-manager";
import { UsageProgress } from "@/components/features/usage-progress";

interface BillingPageProps {
  searchParams: Promise<{
    success?: string;
    canceled?: string;
  }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const t = await getTranslations("Billing");
  const params = await searchParams;
  const planResult = await getCurrentPlan();
  const currentPlan = planResult.data?.plan_type ?? "free";
  const hasSubscription = planResult.data?.has_subscription ?? false;

  let usageData: UsageData | null = null;
  try {
    const usageResult = await getUsageData();
    if (usageResult.success && usageResult.data) {
      usageData = usageResult.data;
    }
  } catch {
    // usage 데이터 로드 실패 시 섹션을 숨김
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("backToSettings")}
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {t("subtitle")}
        </p>
      </div>

      {/* Success / Canceled banners */}
      {params.success === "true" && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
          <div>
            <p className="font-medium text-green-300">
              {t("success.title")}
            </p>
            <p className="mt-0.5 text-sm text-green-400">
              {t("success.description")}
            </p>
          </div>
        </div>
      )}

      {params.canceled === "true" && (
        <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-4">
          <XCircle className="h-5 w-5 flex-shrink-0 text-text-faint" />
          <div>
            <p className="font-medium text-text-tertiary">
              {t("canceled.title")}
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              {t("canceled.description")}
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Info */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted">
              {t("currentPlan")}
            </p>
            <p className="mt-1 text-xl font-bold text-text-primary">
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </p>
          </div>
          {planResult.data?.plan_expires_at && (
            <div className="text-right">
              <p className="text-sm text-text-muted">
                {t("expiresAt")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {new Date(planResult.data.plan_expires_at).toLocaleDateString(
                  "ko-KR",
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      {usageData && (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            {t("usageStatus")}
          </h2>
          <div className="space-y-4">
            <UsageProgress
              label={t("usageLabel.projects")}
              used={usageData.projects.used}
              limit={usageData.projects.limit}
              showUpgradeHint={usageData.planType === "free"}
            />
            <UsageProgress
              label={t("usageLabel.learningPaths")}
              used={usageData.learningPaths.used}
              limit={usageData.learningPaths.limit}
              showUpgradeHint={usageData.planType === "free"}
            />
            <UsageProgress
              label={t("usageLabel.aiChats")}
              used={usageData.aiChats.used}
              limit={usageData.aiChats.limit}
              showUpgradeHint={usageData.planType === "free"}
            />
            {usageData.tokenBudget && (
              <UsageProgress
                label={t("usageLabel.tokenBudget")}
                used={usageData.tokenBudget.used}
                limit={usageData.tokenBudget.limit}
                showUpgradeHint
                formatValue={(v) => v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)}
              />
            )}
          </div>
        </div>
      )}

      {/* Plan Comparison & Billing Manager */}
      <BillingManager currentPlan={currentPlan} hasSubscription={hasSubscription} />
    </div>
  );
}

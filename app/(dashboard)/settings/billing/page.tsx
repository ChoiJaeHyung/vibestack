import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentPlan } from "@/server/actions/billing";
import { getUsageData } from "@/server/actions/usage";
import type { UsageData } from "@/server/actions/usage";
import { BillingManager } from "@/components/features/billing-manager";
import { UsageProgress } from "@/components/features/usage-progress";

interface BillingPageProps {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams;
  const planResult = await getCurrentPlan();
  const currentPlan = planResult.data?.plan_type ?? "free";

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
            설정
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          구독 플랜
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          플랜을 관리하고 결제 정보를 확인하세요
        </p>
      </div>

      {/* Success / Canceled banners */}
      {params.success === "true" && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-300">
              구독이 완료되었습니다!
            </p>
            <p className="mt-0.5 text-sm text-green-700 dark:text-green-400">
              새로운 플랜이 즉시 적용됩니다. 감사합니다.
            </p>
          </div>
        </div>
      )}

      {params.canceled === "true" && (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <XCircle className="h-5 w-5 flex-shrink-0 text-zinc-500" />
          <div>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              결제가 취소되었습니다
            </p>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              언제든지 다시 구독할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Info */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              현재 플랜
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </p>
          </div>
          {planResult.data?.plan_expires_at && (
            <div className="text-right">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                만료일
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            사용량 현황
          </h2>
          <div className="space-y-4">
            <UsageProgress
              label="프로젝트"
              used={usageData.projects.used}
              limit={usageData.projects.limit}
              showUpgradeHint={usageData.planType === "free"}
            />
            <UsageProgress
              label="학습 로드맵 (이번 달)"
              used={usageData.learningPaths.used}
              limit={usageData.learningPaths.limit}
              showUpgradeHint={usageData.planType === "free"}
            />
            <UsageProgress
              label="AI 대화 (이번 달)"
              used={usageData.aiChats.used}
              limit={usageData.aiChats.limit}
              showUpgradeHint={usageData.planType === "free"}
            />
          </div>
        </div>
      )}

      {/* Plan Comparison & Billing Manager */}
      <BillingManager currentPlan={currentPlan} />
    </div>
  );
}

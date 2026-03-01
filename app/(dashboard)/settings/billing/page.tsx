import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentPlan } from "@/server/actions/billing";
import { getUsageData } from "@/server/actions/usage";
import type { UsageData } from "@/server/actions/usage";
import { BillingManager } from "@/components/features/billing-manager";
import { UsageProgress } from "@/components/features/usage-progress";
import { PaymentConfirm } from "@/components/features/payment-confirm";

interface BillingPageProps {
  searchParams: Promise<{
    success?: string;
    canceled?: string;
    orderId?: string;
    paymentKey?: string;
    amount?: string;
  }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams;
  const planResult = await getCurrentPlan();
  const currentPlan = planResult.data?.plan_type ?? "free";
  const hasBillingKey = planResult.data?.has_billing_key ?? false;

  // 토스 결제 성공 리다이렉트: paymentKey, orderId, amount 파라미터 존재 시 confirm 처리
  const needsConfirm = !!(params.paymentKey && params.orderId && params.amount);

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
        <h1 className="text-2xl font-bold text-text-primary">
          구독 플랜
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          플랜을 관리하고 결제 정보를 확인하세요
        </p>
      </div>

      {/* Payment Confirm (토스 결제 성공 리다이렉트 시) */}
      {needsConfirm && (
        <PaymentConfirm
          paymentKey={params.paymentKey!}
          orderId={params.orderId!}
          amount={Number(params.amount!)}
        />
      )}

      {/* Success / Canceled banners */}
      {params.success === "true" && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
          <div>
            <p className="font-medium text-green-300">
              구독이 완료되었습니다!
            </p>
            <p className="mt-0.5 text-sm text-green-400">
              새로운 플랜이 즉시 적용됩니다. 감사합니다.
            </p>
          </div>
        </div>
      )}

      {params.canceled === "true" && (
        <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-4">
          <XCircle className="h-5 w-5 flex-shrink-0 text-text-faint" />
          <div>
            <p className="font-medium text-text-tertiary">
              결제가 취소되었습니다
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              언제든지 다시 구독할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Info */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted">
              현재 플랜
            </p>
            <p className="mt-1 text-xl font-bold text-text-primary">
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </p>
          </div>
          {planResult.data?.plan_expires_at && (
            <div className="text-right">
              <p className="text-sm text-text-muted">
                만료일
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
      <BillingManager currentPlan={currentPlan} hasBillingKey={hasBillingKey} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Coins, ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getTransactionHistory } from "@/server/actions/points";
import { hasValidByokKey } from "@/lib/utils/usage-limits";
import { getSystemSetting } from "@/lib/utils/system-settings";
import { RewardShop } from "@/components/features/reward-shop";

export default async function RewardsPage() {
  const t = await getTranslations("Dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const pointSystemEnabled = await getSystemSetting<boolean>("point_system_enabled");
  if (!pointSystemEnabled) {
    redirect("/dashboard");
  }

  const [txResult, hasByok] = await Promise.all([
    getTransactionHistory(10, 0),
    hasValidByokKey(user.id),
  ]);

  const transactions = txResult.success ? (txResult.data ?? []) : [];

  // Transaction type labels
  const TX_LABELS: Record<string, { ko: string; en: string }> = {
    module_complete: { ko: "모듈 완료", en: "Module complete" },
    quiz_perfect: { ko: "퀴즈 만점", en: "Perfect quiz" },
    quiz_high_score: { ko: "퀴즈 고득점", en: "High quiz score" },
    streak_milestone: { ko: "스트릭 달성", en: "Streak milestone" },
    badge_earned: { ko: "배지 획득", en: "Badge earned" },
    arch_challenge: { ko: "아키텍처 챌린지", en: "Architecture challenge" },
    refactor_challenge: { ko: "리팩토링 챌린지", en: "Refactoring challenge" },
    reward_purchase: { ko: "보상 구매", en: "Reward purchase" },
    reward_refund: { ko: "보상 환불", en: "Reward refund" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("points.backToDashboard")}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("points.shopTitle")}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {t("points.shopDescription")}
          </p>
        </div>
      </div>

      {/* Reward Shop */}
      <RewardShop hasByok={hasByok} />

      {/* Transaction History */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-text-muted" />
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            {t("points.history")}
          </h2>
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const label = TX_LABELS[tx.transactionType];
              const displayLabel = label
                ? (t("points.locale") === "ko" ? label.ko : label.en)
                : tx.description ?? tx.transactionType;

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      tx.amount > 0 ? "bg-green-500/10" : "bg-red-500/10"
                    }`}>
                      <Coins className={`h-4 w-4 ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`} />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">{displayLabel}</p>
                      <p className="text-xs text-text-dim">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${
                    tx.amount > 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount} VP
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-faint">{t("points.noHistory")}</p>
        )}
      </div>
    </div>
  );
}

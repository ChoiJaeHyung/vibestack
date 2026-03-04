"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Coins,
  Gift,
  Check,
  Loader2,
  Swords,
  Palette,
  BarChart3,
  RefreshCw,
  MessageCirclePlus,
  FolderPlus,
  Award,
  Crown,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getActiveRewards,
  getPointBalance,
  purchaseReward,
  type RewardItem,
  type PointBalance,
} from "@/server/actions/points";

// Map reward icon names to components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Swords,
  Palette,
  BarChart3,
  RefreshCw,
  MessageCirclePlus,
  FolderPlus,
  Award,
  Crown,
  Gift,
};

export function RewardShop({ hasByok }: { hasByok: boolean }) {
  const t = useTranslations("Dashboard");
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [balance, setBalance] = useState<PointBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{ rewardId: string; success: boolean; error?: string } | null>(null);

  const loadData = useCallback(async () => {
    const [rewardsResult, balanceResult] = await Promise.all([
      getActiveRewards(),
      getPointBalance(),
    ]);
    if (rewardsResult.success && rewardsResult.data) {
      setRewards(rewardsResult.data);
    }
    if (balanceResult.success && balanceResult.data) {
      setBalance(balanceResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Data fetch on mount — safe to trigger state updates here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handlePurchase = async (reward: RewardItem) => {
    setPurchasing(reward.id);
    setPurchaseResult(null);

    const result = await purchaseReward(reward.id);
    setPurchaseResult({ rewardId: reward.id, success: result.success, error: result.error });
    setPurchasing(null);

    if (result.success) {
      // Refresh data
      await loadData();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl skeleton" />
        ))}
      </div>
    );
  }

  const currentBalance = balance?.currentBalance ?? 0;

  return (
    <div className="space-y-6">
      {/* Balance header */}
      <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Coins className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-text-faint">{t("points.balance")}</p>
            <p className="text-2xl font-bold text-text-primary tabular-nums">
              {currentBalance.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-amber-400">VP</span>
            </p>
          </div>
        </div>
      </div>

      {/* Reward cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {rewards.map((reward) => {
          const IconComponent = ICON_MAP[reward.icon] ?? Gift;
          const isServerKeyOnly = reward.category === "server_key_only";
          const isUnavailableForByok = isServerKeyOnly && hasByok;
          const canAfford = currentBalance >= reward.cost;
          const isPurchasing = purchasing === reward.id;
          const result = purchaseResult?.rewardId === reward.id ? purchaseResult : null;

          return (
            <div
              key={reward.id}
              className={`relative rounded-2xl border p-5 transition-all ${
                reward.purchased
                  ? "border-green-500/20 bg-green-500/[0.03]"
                  : isUnavailableForByok
                    ? "border-border-default bg-bg-surface opacity-60"
                    : "border-border-default bg-bg-surface hover:border-border-hover"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  reward.purchased ? "bg-green-500/10" : "bg-violet-500/10"
                }`}>
                  <IconComponent className={`h-5 w-5 ${reward.purchased ? "text-green-400" : "text-violet-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-text-primary">{reward.name}</h3>
                  <p className="mt-0.5 text-xs text-text-faint">{reward.description}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm font-bold text-amber-400 tabular-nums">
                      <Coins className="h-3.5 w-3.5" />
                      {reward.cost.toLocaleString()} VP
                    </span>

                    {reward.purchased ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Check className="h-3.5 w-3.5" />
                        {t("points.purchased")}
                      </span>
                    ) : isUnavailableForByok ? (
                      <span className="flex items-center gap-1 text-xs text-text-dim">
                        <Lock className="h-3 w-3" />
                        {t("points.alreadyUnlimited")}
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePurchase(reward)}
                        disabled={!canAfford || isPurchasing}
                      >
                        {isPurchasing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : canAfford ? (
                          t("points.buy")
                        ) : (
                          t("points.notEnough")
                        )}
                      </Button>
                    )}
                  </div>

                  {result && !result.success && (
                    <p className="mt-2 text-xs text-red-400">{result.error}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

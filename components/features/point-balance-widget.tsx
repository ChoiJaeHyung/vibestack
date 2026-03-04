"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Coins, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PointBalanceWidgetProps {
  initialBalance?: number;
  initialTotalEarned?: number;
}

export function PointBalanceWidget({
  initialBalance = 0,
  initialTotalEarned = 0,
}: PointBalanceWidgetProps) {
  const t = useTranslations("Dashboard");
  const [mounted, setMounted] = useState(false);

  // Client-only mount flag for hydration-safe number formatting
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            {t("points.title")}
          </h2>
        </div>
        <Link href="/rewards">
          <Button variant="ghost" size="sm" className="text-xs text-amber-400 hover:text-amber-300">
            {t("points.shop")}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-text-primary tabular-nums">
            {mounted ? initialBalance.toLocaleString() : "0"}
            <span className="ml-1 text-sm font-normal text-amber-400">VP</span>
          </p>
          <p className="mt-1 text-xs text-text-faint">{t("points.balance")}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-text-faint">
            <TrendingUp className="h-3 w-3 text-green-400" />
            <span className="tabular-nums">{mounted ? initialTotalEarned.toLocaleString() : "0"}</span>
            <span>VP</span>
          </div>
          <p className="mt-0.5 text-[10px] text-text-dim">{t("points.totalEarned")}</p>
        </div>
      </div>
    </div>
  );
}

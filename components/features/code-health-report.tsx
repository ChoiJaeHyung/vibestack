"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Loader2, RefreshCcw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getHealthScore, recalculateHealthScore } from "@/server/actions/code-health";
import { AnimatedCounter } from "@/components/features/animated-counter";
import { HealthScoreCard } from "@/components/features/health-score-card";
import { ImprovementList } from "@/components/features/improvement-list";
import type { HealthScoreResult } from "@/lib/analysis/health-scorer";

interface CodeHealthReportProps {
  projectId: string;
  onStartChallenge?: () => void;
}

function getOverallColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function getBarColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

export function CodeHealthReport({ projectId, onStartChallenge }: CodeHealthReportProps) {
  const t = useTranslations("Projects");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    overallScore: number;
    categories: HealthScoreResult["categories"];
    improvementItems: HealthScoreResult["improvementItems"];
  } | null>(null);

  const loadScore = useCallback(() => {
    getHealthScore(projectId).then((result) => {
      if (result.success && result.data) {
        setData({
          overallScore: result.data.overallScore,
          categories: result.data.categories,
          improvementItems: result.data.improvementItems,
        });
        setError(null);
      } else {
        setError(result.error ?? "Failed to load health score");
      }
      setLoading(false);
    });
  }, [projectId]);

  useEffect(() => {
    loadScore();
  }, [loadScore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const result = await recalculateHealthScore(projectId);
    if (result.success && result.data) {
      setData({
        overallScore: result.data.overallScore,
        categories: result.data.categories,
        improvementItems: result.data.improvementItems,
      });
      setError(null);
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-text-muted">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={handleRefresh}>
            {t("analysis.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Chart data
  const chartData = data.categories.map((c) => ({
    name: t(`health.categories.${c.category as "code_quality" | "security" | "architecture" | "code_structure" | "learnability"}`),
    score: c.score,
  }));

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-text-muted" />
              <CardTitle>{t("health.title")}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {t("health.recalculate")}
            </Button>
          </div>
          <CardDescription>{t("health.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Big score */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getOverallColor(data.overallScore)}`}>
                <AnimatedCounter target={data.overallScore} duration={1500} />
              </div>
              <p className="mt-1 text-xs text-text-faint">{t("health.outOf100")}</p>
            </div>

            {/* Bar chart */}
            <div className="h-[160px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "12px",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Score guide */}
          <div className="mt-4 flex gap-4 text-[10px] text-text-faint">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {t("health.scoreGuide.high")}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {t("health.scoreGuide.medium")}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {t("health.scoreGuide.low")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Category cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.categories.map((cat) => (
          <HealthScoreCard key={cat.category} category={cat} />
        ))}
      </div>

      {/* Improvement items */}
      <Card>
        <CardHeader>
          <CardTitle>{t("health.improvements.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ImprovementList
            items={data.improvementItems}
            onStartChallenge={onStartChallenge ? () => onStartChallenge() : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}

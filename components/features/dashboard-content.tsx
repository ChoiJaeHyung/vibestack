"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/features/project-card";
import { TechChart } from "@/components/features/tech-chart";
import { DashboardUpgradeBanner } from "@/components/features/dashboard-upgrade-banner";
import { UsageProgress } from "@/components/features/usage-progress";
import {
  FolderOpen,
  Code,
  GraduationCap,
  MessageCircle,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import type { DashboardData } from "@/app/api/dashboard/route";

// ─── Fetcher ────────────────────────────────────────────────────────

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error("Failed to load dashboard");
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Unknown error");
  return json.data as DashboardData;
}

// ─── Skeleton (mirrors loading.tsx) ─────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800/50" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-12 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800/50" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage section */}
      <div className="space-y-4">
        <div className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="rounded-xl border border-zinc-200 p-5 space-y-4 dark:border-zinc-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800/50" />
              <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent projects */}
      <div className="space-y-4">
        <div className="h-5 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  progress,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  progress?: number;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {value}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
            {progress !== undefined && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-600 transition-all dark:bg-zinc-400"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DashboardContent() {
  const { data, isLoading } = useCachedFetch<DashboardData>(
    "/api/dashboard",
    fetchDashboard,
  );

  // Show skeleton when loading and no cached data
  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  const stats = data;
  const userEmail = stats?.userEmail ?? "User";
  const usageData = stats?.usage ?? null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          안녕하세요, {userEmail}님!
        </p>
      </div>

      {/* Upgrade Banner */}
      {usageData && (
        <DashboardUpgradeBanner planType={usageData.planType} />
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          label="총 프로젝트"
          value={String(stats?.totalProjects ?? 0)}
        />
        <StatCard
          icon={Code}
          label="감지된 기술"
          value={String(stats?.uniqueTechnologies ?? 0)}
        />
        <StatCard
          icon={GraduationCap}
          label="학습 진행률"
          value={`${stats?.learningProgress.percentage ?? 0}%`}
          progress={stats?.learningProgress.percentage ?? 0}
        />
        <StatCard
          icon={MessageCircle}
          label="AI 대화 (이번 달)"
          value={String(stats?.monthlyChats ?? 0)}
        />
      </div>

      {/* Usage */}
      {usageData && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            사용량
          </h2>
          <Card>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Projects */}
      {stats && stats.recentProjects.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              최근 프로젝트
            </h2>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                전체 보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4">
            {stats.recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={null}
                status={
                  project.status as
                    | "created"
                    | "uploaded"
                    | "analyzing"
                    | "analyzed"
                    | "error"
                }
                updatedAt={project.updated_at}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>시작하기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              MCP 서버를 연결하거나 프로젝트를 직접 업로드하여 기술 스택 분석을
              시작하세요. AI가 프로젝트를 분석하고 맞춤 학습 로드맵을 생성해
              드립니다.
            </p>
            <div className="flex gap-2">
              <Link href="/settings">
                <Button variant="secondary" size="sm">
                  API 키 설정
                </Button>
              </Link>
              <Link href="/projects">
                <Button variant="secondary" size="sm">
                  프로젝트 관리
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tech Distribution Chart */}
      {stats && stats.techDistribution.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            기술 분포
          </h2>
          <Card>
            <CardContent>
              <TechChart data={stats.techDistribution} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Learning Activity */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          학습 현황
        </h2>
        {stats?.currentLearning ? (
          <Card>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <BookOpen className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {stats.currentLearning.pathTitle}
                  </p>
                  <h3 className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {stats.currentLearning.moduleTitle}
                  </h3>
                  <Link
                    href={`/learning/${stats.currentLearning.pathId}/${stats.currentLearning.moduleId}`}
                  >
                    <Button variant="primary" size="sm" className="mt-3">
                      이어서 학습하기
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <GraduationCap className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    아직 진행 중인 학습이 없습니다. 프로젝트를 분석한 후 학습
                    로드맵을 생성해보세요.
                  </p>
                  <Link href="/learning">
                    <Button variant="ghost" size="sm" className="mt-2">
                      학습 시작하기
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

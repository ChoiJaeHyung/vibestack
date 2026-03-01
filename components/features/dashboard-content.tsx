"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardUpgradeBanner } from "@/components/features/dashboard-upgrade-banner";
import {
  FolderOpen,
  Code,
  GraduationCap,
  MessageCircle,
  ArrowRight,
  BookOpen,
  Settings,
  Sparkles,
} from "lucide-react";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import type { DashboardData } from "@/app/api/dashboard/route";

// ─── Helpers ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "새벽에도 열심히!";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후에요";
  return "좋은 저녁이에요";
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString();
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error("Failed to load dashboard");
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Unknown error");
  return json.data as DashboardData;
}

// ─── Animated Counter ─────────────────────────────────────────────────

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Client-only animation from 0 → value — safe to setState here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value === 0) { setCount(0); return; }
    let start = 0;
    const duration = 800;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span className="tabular-nums">{count}</span>;
}

// ─── Progress Ring ────────────────────────────────────────────────────

function ProgressRing({
  percent,
  size = 56,
  strokeWidth = 3,
  label,
  used,
  limit,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  used: number;
  limit: number | null;
}) {
  const [mounted, setMounted] = useState(false);
  // Client-only mount animation — safe to setState here
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (mounted ? percent : 0) / 100);

  const ringColor =
    percent >= 90
      ? "stroke-red-500"
      : percent >= 80
        ? "stroke-amber-500"
        : "stroke-violet-500";

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            className="fill-none stroke-ring-track"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            className={`fill-none transition-all duration-700 ease-out ${ringColor}`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold text-text-secondary tabular-nums">{Math.round(percent)}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-faint">{label}</p>
        <p className="text-sm font-medium text-text-secondary tabular-nums">
          {limit === null ? "무제한" : `${used} / ${limit}`}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="h-7 w-48 rounded-lg skeleton" />
        <div className="mt-2 h-4 w-32 rounded-lg skeleton" />
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-7 w-12 rounded-lg skeleton" />
                <div className="h-3 w-20 rounded-lg skeleton" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bento grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 h-44 skeleton" />
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 h-44 skeleton" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 h-48 skeleton" />
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 h-48 skeleton" />
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-default bg-bg-surface p-5 hover:border-border-hover transition-all duration-300">
      {/* Hover gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-cyan-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
          <Icon className="h-5 w-5 text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-bold text-text-primary tracking-tight tabular-nums">
            <AnimatedCounter value={value} />{suffix ?? ""}
          </p>
          <p className="text-sm text-text-faint">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Compact Project Row (for dashboard) ──────────────────────────────

function CompactProjectRow({
  id,
  name,
  status,
  updatedAt,
}: {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}) {
  const statusStyles: Record<string, string> = {
    analyzed: "bg-green-500/10 text-green-400",
    analyzing: "bg-violet-500/10 text-violet-400",
    uploaded: "bg-zinc-500/10 text-text-muted",
    created: "bg-zinc-500/10 text-text-muted",
    error: "bg-red-500/10 text-red-400",
  };
  const statusLabels: Record<string, string> = {
    analyzed: "Analyzed",
    analyzing: "Analyzing",
    uploaded: "Uploaded",
    created: "Created",
    error: "Error",
  };

  return (
    <Link href={`/projects/${id}`}>
      <div className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-bg-surface transition-colors group">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
            <FolderOpen className="h-4 w-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-secondary truncate group-hover:text-white transition-colors">
              {name}
            </p>
            <p className="text-xs text-text-dim">{formatRelativeTime(updatedAt)}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[status] ?? statusStyles.created}`}>
          {statusLabels[status] ?? status}
        </span>
      </div>
    </Link>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DashboardContent() {
  const { data, isLoading } = useCachedFetch<DashboardData>(
    "/api/dashboard",
    fetchDashboard,
  );

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  const stats = data;
  const userEmail = stats?.userEmail ?? "User";
  const usageData = stats?.usage ?? null;

  const totalProjects = stats?.totalProjects ?? 0;
  const uniqueTech = stats?.uniqueTechnologies ?? 0;
  const learningPercent = stats?.learningProgress.percentage ?? 0;
  const monthlyChats = stats?.monthlyChats ?? 0;

  return (
    <div className="space-y-6">
      {/* Header: greeting */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {getGreeting()}, {userEmail.split("@")[0]}님
        </h1>
        <p className="mt-1 text-sm text-text-faint">
          오늘도 프로젝트로 배워볼까요?
        </p>
      </div>

      {/* Upgrade Banner */}
      {usageData && (
        <DashboardUpgradeBanner planType={usageData.planType} />
      )}

      {/* 4 Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FolderOpen} label="총 프로젝트" value={totalProjects} />
        <StatCard icon={Code} label="감지된 기술" value={uniqueTech} />
        <StatCard icon={GraduationCap} label="학습 진행률" value={learningPercent} suffix="%" />
        <StatCard icon={MessageCircle} label="AI 대화" value={monthlyChats} />
      </div>

      {/* Bento Grid Row 1: Continue Learning + Usage */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Continue Learning */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            학습 현황
          </h2>
          {stats?.currentLearning ? (
            <div className="flex items-start gap-4">
              {/* Mini progress ring */}
              <div className="relative h-12 w-12 shrink-0">
                <svg className="-rotate-90" width={48} height={48} viewBox="0 0 48 48">
                  <circle cx={24} cy={24} r={20} className="fill-none stroke-ring-track" strokeWidth={3} />
                  <circle cx={24} cy={24} r={20}
                    className="fill-none stroke-violet-500 transition-all duration-700"
                    strokeWidth={3} strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 * (1 - learningPercent / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-violet-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-faint">{stats.currentLearning.pathTitle}</p>
                <h3 className="mt-0.5 text-sm font-medium text-text-primary truncate">
                  {stats.currentLearning.moduleTitle}
                </h3>
                <Link href={`/learning/${stats.currentLearning.pathId}/${stats.currentLearning.moduleId}`}>
                  <Button variant="primary" size="sm" className="mt-3">
                    이어서 학습하기
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-text-faint">
              <GraduationCap className="h-5 w-5 text-text-dim" />
              <div>
                <p>진행 중인 학습이 없습니다</p>
                <Link href="/learning" className="text-violet-400 hover:text-violet-300 transition-colors text-xs">
                  학습 시작하기 →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Usage (Progress Rings) */}
        {usageData ? (
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
              사용량
            </h2>
            <div className="space-y-4">
              <ProgressRing
                label="프로젝트"
                percent={usageData.projects.limit ? Math.min((usageData.projects.used / usageData.projects.limit) * 100, 100) : 0}
                used={usageData.projects.used}
                limit={usageData.projects.limit}
              />
              <ProgressRing
                label="학습 로드맵 (이번 달)"
                percent={usageData.learningPaths.limit ? Math.min((usageData.learningPaths.used / usageData.learningPaths.limit) * 100, 100) : 0}
                used={usageData.learningPaths.used}
                limit={usageData.learningPaths.limit}
              />
              <ProgressRing
                label="AI 대화 (이번 달)"
                percent={usageData.aiChats.limit ? Math.min((usageData.aiChats.used / usageData.aiChats.limit) * 100, 100) : 0}
                used={usageData.aiChats.used}
                limit={usageData.aiChats.limit}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">사용량</h2>
            <p className="text-sm text-text-faint">데이터를 불러오는 중...</p>
          </div>
        )}
      </div>

      {/* Bento Grid Row 2: Recent Projects + Tech Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Projects (compact rows) */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              최근 프로젝트
            </h2>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-xs">
                전체 보기
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
          {stats && stats.recentProjects.length > 0 ? (
            <div className="space-y-1">
              {stats.recentProjects.slice(0, 4).map((project) => (
                <CompactProjectRow
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  status={project.status}
                  updatedAt={project.updated_at}
                />
              ))}
            </div>
          ) : (
            <EmptyDashboard />
          )}
        </div>

        {/* Tech Distribution (inline — TechChart replaced later) */}
        {stats && stats.techDistribution.length > 0 ? (
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              기술 분포
            </h2>
            <TechDistributionInline data={stats.techDistribution} />
          </div>
        ) : (
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              기술 분포
            </h2>
            <p className="text-sm text-text-faint">프로젝트를 분석하면 기술 분포를 확인할 수 있어요</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty State (3-step onboarding) ──────────────────────────────────

function EmptyDashboard() {
  const steps = [
    { icon: Settings, label: "MCP 설정", desc: "Claude Code나 Cursor에서 연결", href: "/settings" },
    { icon: FolderOpen, label: "프로젝트 동기화", desc: "자동으로 파일 수집 & 분석", href: "/projects" },
    { icon: Sparkles, label: "학습 시작", desc: "AI 맞춤 커리큘럼 생성", href: "/learning" },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        return (
          <Link key={idx} href={step.href}>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-bg-surface transition-colors group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-bold text-violet-400 shrink-0">
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors">
                  {step.label}
                </p>
                <p className="text-xs text-text-dim">{step.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Tech Distribution Inline (small donut + labels) ──────────────────

const CATEGORY_COLORS: Record<string, string> = {
  framework: "#8B5CF6",
  language: "#3B82F6",
  database: "#10B981",
  auth: "#F59E0B",
  deploy: "#06B6D4",
  styling: "#EC4899",
  testing: "#F97316",
  build_tool: "#EAB308",
  library: "#6366F1",
  other: "#71717A",
};

const CATEGORY_LABELS: Record<string, string> = {
  framework: "프레임워크",
  language: "언어",
  database: "DB",
  auth: "인증",
  deploy: "배포",
  styling: "스타일링",
  testing: "테스팅",
  build_tool: "빌드",
  library: "라이브러리",
  other: "기타",
};

function TechDistributionInline({ data }: { data: Array<{ category: string; count: number }> }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  // Build SVG donut segments using reduce to avoid mutable variable
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const size = 120;
  const radius = 44;
  const innerRadius = 30;
  const cx = size / 2;
  const cy = size / 2;

  const { segments } = sortedData.reduce<{
    segments: Array<{ category: string; count: number; path: string; color: string }>;
    cumAngle: number;
  }>(
    (acc, item) => {
      const angle = (item.count / total) * 360;
      const startAngle = acc.cumAngle;
      const endAngle = acc.cumAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);
      const x3 = cx + innerRadius * Math.cos(endRad);
      const y3 = cy + innerRadius * Math.sin(endRad);
      const x4 = cx + innerRadius * Math.cos(startRad);
      const y4 = cy + innerRadius * Math.sin(startRad);

      const largeArc = angle > 180 ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        "Z",
      ].join(" ");

      acc.segments.push({
        ...item,
        path: d,
        color: CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other,
      });
      acc.cumAngle = endAngle;
      return acc;
    },
    { segments: [], cumAngle: -90 },
  );

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {segments.map((seg, idx) => (
          <path key={idx} d={seg.path} fill={seg.color} opacity={0.85} />
        ))}
        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-zinc-100 text-lg font-bold" style={{ fontSize: 18 }}>
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-zinc-500" style={{ fontSize: 10 }}>
          기술
        </text>
      </svg>

      {/* Labels */}
      <div className="flex-1 space-y-1.5">
        {sortedData.slice(0, 5).map((item) => (
          <div key={item.category} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other }}
              />
              <span className="text-text-muted">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </span>
            </div>
            <span className="text-text-secondary tabular-nums font-medium">{item.count}</span>
          </div>
        ))}
        {sortedData.length > 5 && (
          <p className="text-[11px] text-text-dim">+{sortedData.length - 5} more</p>
        )}
      </div>
    </div>
  );
}

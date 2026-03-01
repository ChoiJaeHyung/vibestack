import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Code,
  HelpCircle,
  FolderOpen,
  Clock,
  CheckCircle2,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLearningPathDetail } from "@/server/actions/learning";
import { DIFFICULTY_STYLES } from "@/components/features/learning-path-card";

const MODULE_TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    className: string;
  }
> = {
  concept: {
    icon: BookOpen,
    label: "Concept",
    className: "bg-blue-500/10 text-blue-300 border border-blue-500/20",
  },
  practical: {
    icon: Code,
    label: "Practical",
    className: "bg-violet-500/10 text-violet-300 border border-violet-500/20",
  },
  quiz: {
    icon: HelpCircle,
    label: "Quiz",
    className: "bg-orange-500/10 text-orange-300 border border-orange-500/20",
  },
  project_walkthrough: {
    icon: FolderOpen,
    label: "Walkthrough",
    className: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
  },
};

interface PageProps {
  params: Promise<{ pathId: string }>;
}

export default async function LearningPathDetailPage({ params }: PageProps) {
  const { pathId } = await params;
  const result = await getLearningPathDetail(pathId);

  if (!result.success || !result.data) {
    notFound();
  }

  const path = result.data;
  const completedCount = path.modules.filter(
    (m) => m.progress?.status === "completed",
  ).length;
  const progressPercent =
    path.total_modules > 0
      ? Math.round((completedCount / path.total_modules) * 100)
      : 0;

  const difficultyStyle = path.difficulty
    ? DIFFICULTY_STYLES[path.difficulty]
    : null;

  // SVG progress ring
  const ringSize = 48;
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressPercent / 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/learning"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-violet-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Learning
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {path.title}
            </h1>
            {path.description && (
              <p className="mt-1 text-sm text-text-muted">
                {path.description}
              </p>
            )}
          </div>
          {difficultyStyle && (
            <span
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${difficultyStyle.className}`}
            >
              {difficultyStyle.label}
            </span>
          )}
        </div>

        {/* Progress overview with mini ring */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-border-default bg-bg-surface p-4">
          {/* Mini progress ring */}
          <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
            <svg className="-rotate-90" width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
              <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} className="fill-none stroke-ring-track" strokeWidth={3} />
              <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
                className={`fill-none ${progressPercent === 100 ? "stroke-green-500" : "stroke-violet-500"}`}
                strokeWidth={3} strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold text-text-secondary tabular-nums">{progressPercent}%</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-tertiary">
                {completedCount} / {path.total_modules} 모듈 완료
              </span>
              <span className="text-sm font-bold text-text-primary tabular-nums">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-surface-hover">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {path.estimated_hours !== null && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-text-faint">
                <Clock className="h-3 w-3" />
                예상 소요 시간: {path.estimated_hours}시간
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline-style module list */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          모듈 목록
        </h2>
        <div className="relative space-y-0">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-bg-surface-hover" />

          {path.modules.map((mod, idx) => {
            const isCompleted = mod.progress?.status === "completed";
            const isInProgress = mod.progress?.status === "in_progress";
            const typeConfig = mod.module_type
              ? MODULE_TYPE_CONFIG[mod.module_type]
              : null;
            const TypeIcon = typeConfig?.icon ?? BookOpen;

            return (
              <Link
                key={mod.id}
                href={`/learning/${pathId}/${mod.id}`}
              >
                <div className="group relative flex gap-4 pb-6 last:pb-0">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 ring-2 ring-green-500/40">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      </div>
                    ) : isInProgress ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 ring-2 ring-violet-500/40 animate-pulse">
                        <span className="text-xs font-bold text-violet-300 tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-input ring-1 ring-border-strong">
                        <span className="text-xs font-medium text-text-dim tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                      </div>
                    )}
                  </div>

                  {/* Module card */}
                  <div className={`flex-1 rounded-xl border p-4 transition-all ${
                    isInProgress
                      ? "border-violet-500/30 bg-violet-500/[0.05] shadow-[0_0_20px_rgba(139,92,246,0.06)]"
                      : "border-border-default bg-bg-surface group-hover:border-border-hover"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={`font-medium ${isCompleted ? "text-text-faint line-through" : "text-text-primary"}`}>
                          {mod.title}
                        </h3>
                        {mod.description && (
                          <p className="mt-0.5 text-sm text-text-faint line-clamp-1">{mod.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {typeConfig && (
                          <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${typeConfig.className}`}>
                            <TypeIcon className="h-3 w-3" />
                            {typeConfig.label}
                          </span>
                        )}
                        {mod.estimated_minutes !== null && (
                          <span className="text-xs text-text-dim tabular-nums">{mod.estimated_minutes}분</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI Tutor button */}
      <div className="flex justify-center pb-8">
        <Link href={`/learning/${pathId}/${path.modules[0]?.id ?? ""}`}>
          <Button variant="secondary" size="lg">
            <Brain className="mr-2 h-5 w-5" />
            AI 튜터와 학습하기
          </Button>
        </Link>
      </div>
    </div>
  );
}

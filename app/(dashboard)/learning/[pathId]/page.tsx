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
  Circle,
  PlayCircle,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  practical: {
    icon: Code,
    label: "Practical",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  quiz: {
    icon: HelpCircle,
    label: "Quiz",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  project_walkthrough: {
    icon: FolderOpen,
    label: "Walkthrough",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/learning"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Learning
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {path.title}
            </h1>
            {path.description && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
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

        {/* Progress overview */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <span>
              {completedCount} / {path.total_modules} 모듈 완료
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all dark:bg-white"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {path.estimated_hours !== null && (
            <p className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <Clock className="h-3 w-3" />
              예상 소요 시간: {path.estimated_hours}시간
            </p>
          )}
        </div>
      </div>

      {/* Module list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          모듈 목록
        </h2>
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
              <Card
                className={`transition-shadow hover:shadow-md ${
                  isInProgress
                    ? "ring-2 ring-zinc-900 dark:ring-white"
                    : ""
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div className="flex shrink-0 items-center justify-center">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : isInProgress ? (
                        <PlayCircle className="h-5 w-5 text-zinc-900 dark:text-white" />
                      ) : (
                        <Circle className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                      )}
                    </div>

                    {/* Module info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h3
                          className={`font-medium ${
                            isCompleted
                              ? "text-zinc-500 line-through dark:text-zinc-500"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {mod.title}
                        </h3>
                      </div>
                      {mod.description && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {mod.description}
                        </p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex shrink-0 items-center gap-2">
                      {typeConfig && (
                        <span
                          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${typeConfig.className}`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig.label}
                        </span>
                      )}
                      {mod.estimated_minutes !== null && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {mod.estimated_minutes}분
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
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

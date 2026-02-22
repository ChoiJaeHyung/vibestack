import Link from "next/link";
import { BookOpen, Code, HelpCircle, FolderOpen, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface LearningPathCardProps {
  id: string;
  title: string;
  description: string | null;
  difficulty: Difficulty | null;
  estimatedHours: number | null;
  totalModules: number;
  completedModules: number;
  status: string;
  projectName: string | null;
}

const DIFFICULTY_STYLES: Record<
  Difficulty,
  { label: string; className: string }
> = {
  beginner: {
    label: "Beginner",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  intermediate: {
    label: "Intermediate",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  advanced: {
    label: "Advanced",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
};

const MODULE_TYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  concept: BookOpen,
  practical: Code,
  quiz: HelpCircle,
  project_walkthrough: FolderOpen,
};

function getModuleTypeIcon(
  moduleType: string,
): React.ComponentType<{ className?: string }> {
  return MODULE_TYPE_ICONS[moduleType] ?? BookOpen;
}

export { getModuleTypeIcon, DIFFICULTY_STYLES };

export function LearningPathCard({
  id,
  title,
  description,
  difficulty,
  estimatedHours,
  totalModules,
  completedModules,
  status,
  projectName,
}: LearningPathCardProps) {
  const difficultyStyle = difficulty
    ? DIFFICULTY_STYLES[difficulty]
    : null;
  const progressPercent =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <Link href={`/learning/${id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                {title}
              </h3>
              {description && (
                <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {difficultyStyle && (
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${difficultyStyle.className}`}
                >
                  {difficultyStyle.label}
                </span>
              )}
              {status === "completed" && (
                <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  Completed
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {completedModules} / {totalModules} modules
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all dark:bg-white"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Footer info */}
          <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
            {projectName && <span>{projectName}</span>}
            {estimatedHours !== null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {estimatedHours}h
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

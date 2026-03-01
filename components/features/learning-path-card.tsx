"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Code, HelpCircle, FolderOpen, Clock, CheckCircle2, ArrowRight } from "lucide-react";

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
    className: "bg-green-500/10 text-green-400 border border-green-500/20",
  },
  intermediate: {
    label: "Intermediate",
    className: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  },
  advanced: {
    label: "Advanced",
    className: "bg-red-500/10 text-red-400 border border-red-500/20",
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
  projectName,
}: LearningPathCardProps) {
  const difficultyStyle = difficulty
    ? DIFFICULTY_STYLES[difficulty]
    : null;
  const progressPercent =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  const isComplete = progressPercent === 100;

  const [mounted, setMounted] = useState(false);
  // Client-only mount animation — safe to setState here
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (mounted ? progressPercent : 0) / 100);

  return (
    <Link href={`/learning/${id}`}>
      <div className="group flex items-center gap-5 rounded-2xl border border-border-default bg-bg-surface p-5 hover:border-border-hover hover:shadow-glow-card-purple transition-all duration-300">
        {/* Progress Ring */}
        <div className="relative h-14 w-14 shrink-0">
          <svg className="-rotate-90" width={56} height={56} viewBox="0 0 56 56">
            <circle cx={28} cy={28} r={radius} className="fill-none stroke-ring-track" strokeWidth={3} />
            <circle cx={28} cy={28} r={radius}
              className={`fill-none transition-all duration-700 ease-out ${isComplete ? "stroke-green-500" : "stroke-violet-500"}`}
              strokeWidth={3} strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <span className="text-xs font-bold text-text-secondary tabular-nums">{progressPercent}%</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-text-primary truncate">{title}</h3>
            {difficultyStyle && (
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyStyle.className}`}>
                {difficultyStyle.label}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-sm text-text-faint line-clamp-1">{description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-text-dim">
            <span className="tabular-nums">{completedModules}/{totalModules} modules</span>
            {estimatedHours !== null && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {estimatedHours}h
                </span>
              </>
            )}
            {projectName && (
              <>
                <span>·</span>
                <span className="truncate">{projectName}</span>
              </>
            )}
          </div>
        </div>

        {/* Hover CTA */}
        <ArrowRight className="h-4 w-4 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </Link>
  );
}

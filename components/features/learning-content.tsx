"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LearningPathCard } from "@/components/features/learning-path-card";
import { LearningGenerator } from "@/components/features/learning-generator";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import type { LearningPathsData } from "@/app/api/learning-paths/route";

async function fetchLearningPaths(): Promise<LearningPathsData> {
  const res = await fetch("/api/learning-paths");
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Failed to fetch");
  return json.data as LearningPathsData;
}

export function LearningContent() {
  const { data, isLoading } = useCachedFetch(
    "/api/learning-paths",
    fetchLearningPaths,
  );

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header */}
        <div>
          <div className="h-7 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-2 h-4 w-64 rounded bg-zinc-100 dark:bg-zinc-800/50" />
        </div>

        {/* Generator placeholder */}
        <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="h-5 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 h-10 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800/50" />
        </div>

        {/* Path cards */}
        <div className="space-y-4">
          <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-72 rounded bg-zinc-100 dark:bg-zinc-800/50" />
                  <div className="mt-3 flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800/50" />
                    <div className="h-5 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800/50" />
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const paths = data?.paths ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Learning
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          AI가 생성한 맞춤 학습 로드맵으로 학습하세요
        </p>
      </div>

      {/* Generator */}
      <LearningGenerator />

      {/* Learning paths list */}
      {paths.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
            <GraduationCap className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
          </div>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            아직 학습 로드맵이 없습니다
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            프로젝트를 분석한 후 위에서 로드맵을 생성해보세요
          </p>
          <Link href="/projects" className="mt-4">
            <Button variant="secondary" size="sm">
              프로젝트 관리로 이동
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            내 학습 로드맵
          </h2>
          <div className="grid gap-4">
            {paths.map((path) => (
              <LearningPathCard
                key={path.id}
                id={path.id}
                title={path.title}
                description={path.description}
                difficulty={path.difficulty}
                estimatedHours={path.estimated_hours}
                totalModules={path.total_modules}
                completedModules={path.completedModules}
                status={path.status}
                projectName={path.projectName}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

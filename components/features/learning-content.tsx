"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations('Learning');
  const { data, isLoading } = useCachedFetch(
    "/api/learning-paths",
    fetchLearningPaths,
  );

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header */}
        <div>
          <div className="h-7 w-24 rounded-lg skeleton" />
          <div className="mt-2 h-4 w-64 rounded-lg skeleton" />
        </div>

        {/* Generator placeholder */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6">
          <div className="h-5 w-36 rounded-lg skeleton" />
          <div className="mt-3 h-10 w-full rounded-xl skeleton" />
        </div>

        {/* Path cards */}
        <div className="space-y-4">
          <div className="h-5 w-32 rounded-lg skeleton" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border-default bg-bg-surface p-5"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-48 rounded-lg skeleton" />
                  <div className="h-3 w-72 rounded-lg skeleton" />
                  <div className="mt-3 flex gap-2">
                    <div className="h-5 w-16 rounded-full skeleton" />
                    <div className="h-5 w-20 rounded-full skeleton" />
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 w-full rounded-full skeleton" />
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
        <h1 className="text-2xl font-bold text-text-primary">
          {t('page.title')}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {t('page.subtitle')}
        </p>
      </div>

      {/* Generator */}
      <LearningGenerator hasExistingPaths={paths.length > 0} />

      {/* Learning paths list */}
      {paths.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default py-16">
          <div className="rounded-full bg-violet-500/10 p-4">
            <GraduationCap className="h-8 w-8 text-violet-400" />
          </div>
          <p className="mt-4 text-sm text-text-muted">
            {t('empty.title')}
          </p>
          <p className="mt-1 text-xs text-text-faint">
            {t('empty.description')}
          </p>
          <Link href="/projects" className="mt-4">
            <Button variant="secondary" size="sm">
              {t('empty.goToProjects')}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {t('list.title')}
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

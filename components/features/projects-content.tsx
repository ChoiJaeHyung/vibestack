"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/features/project-card";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import type { ProjectsListData } from "@/app/api/projects-list/route";

function extractTechNames(techSummary: unknown): string[] {
  if (!techSummary || typeof techSummary !== "object") return [];
  if (Array.isArray(techSummary)) {
    return techSummary
      .filter(
        (item): item is { name: string } => typeof item?.name === "string",
      )
      .map((item) => item.name);
  }
  return [];
}

async function fetchProjects(): Promise<ProjectsListData> {
  const res = await fetch("/api/projects-list");
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Failed to fetch");
  return json.data as ProjectsListData;
}

export function ProjectsContent() {
  const { data, isLoading } = useCachedFetch(
    "/api/projects-list",
    fetchProjects,
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800/50" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {/* Project cards */}
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-56 rounded bg-zinc-100 dark:bg-zinc-800/50" />
                </div>
                <div className="h-6 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const projects = data?.projects ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Projects
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            AI로 분석할 프로젝트를 관리하세요
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            아직 프로젝트가 없습니다
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            MCP 서버를 연결하거나 프로젝트를 업로드하세요
          </p>
          <Link href="/settings" className="mt-4">
            <Button variant="secondary" size="sm">
              설정으로 이동
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const techStack = extractTechNames(project.tech_summary);
            return (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description}
                status={project.status}
                techStack={techStack}
                updatedAt={project.updated_at}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

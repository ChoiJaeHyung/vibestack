"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, FolderOpen, BookOpen, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/features/project-card";
import { UpgradeModal } from "@/components/features/upgrade-modal";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import type { ProjectsListData } from "@/app/api/projects-list/route";
import type { UsageData } from "@/server/actions/usage";

type FilterType = "all" | "analyzed" | "analyzing" | "uploaded";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "All",
  analyzed: "Analyzed",
  analyzing: "Analyzing",
  uploaded: "Uploaded",
};

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
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isAtLimit, setIsAtLimit] = useState(false);

  // Fetch usage data to check if user is at project limit
  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/usage");
        const json = await res.json();
        if (json.success && json.data) {
          const usage = json.data as UsageData;
          if (
            usage.projects.limit !== null &&
            usage.projects.used >= usage.projects.limit
          ) {
            setIsAtLimit(true);
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }
    fetchUsage();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-24 rounded-lg skeleton" />
            <div className="mt-2 h-4 w-48 rounded-lg skeleton" />
          </div>
          <div className="h-9 w-32 rounded-xl skeleton" />
        </div>

        {/* Project cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden"
            >
              <div className="h-0.5 w-full skeleton" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-40 rounded-lg skeleton" />
                <div className="h-3 w-56 rounded-lg skeleton" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-14 rounded-md skeleton" />
                  <div className="h-5 w-16 rounded-md skeleton" />
                  <div className="h-5 w-12 rounded-md skeleton" />
                </div>
                <div className="flex justify-between">
                  <div className="h-3 w-20 rounded-lg skeleton" />
                  <div className="h-5 w-16 rounded-full skeleton" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const allProjects = data?.projects ?? [];
  const projects = activeFilter === "all"
    ? allProjects
    : allProjects.filter((p) => p.status === activeFilter);

  return (
    <div className="space-y-6">
      {/* Header + Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Projects
          </h1>
          <p className="mt-1 text-sm text-text-faint">
            {allProjects.length}개 프로젝트
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status filter chips */}
          {allProjects.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 rounded-xl border border-border-default bg-bg-surface p-1">
              {(Object.keys(FILTER_LABELS) as FilterType[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    activeFilter === filter
                      ? "bg-violet-500/15 text-violet-300"
                      : "text-text-faint hover:text-text-tertiary"
                  }`}
                >
                  {FILTER_LABELS[filter]}
                </button>
              ))}
            </div>
          )}
          {isAtLimit ? (
            <Button onClick={() => setShowUpgradeModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          ) : (
            <Link href="/guide">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Project limit banner */}
      {isAtLimit && (
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-left transition-colors hover:bg-amber-500/15"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">
              프로젝트 등록 한도에 도달했어요
            </p>
            <p className="mt-0.5 text-xs text-amber-400/70">
              Pro로 업그레이드하면 무제한으로 프로젝트를 추가할 수 있어요
            </p>
          </div>
          <span className="text-xs font-medium text-amber-400">
            업그레이드
          </span>
        </button>
      )}

      {projects.length === 0 && allProjects.length === 0 ? (
        /* Empty state */
        <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default bg-bg-surface py-20">
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <FolderOpen className="h-8 w-8 text-violet-400" />
            </div>
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-500/30 animate-pulse" />
            <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-violet-500/40 animate-pulse" style={{ animationDelay: "150ms" }} />
          </div>
          <h3 className="mt-5 text-base font-semibold text-text-secondary">첫 프로젝트를 추가하세요</h3>
          <p className="mt-1.5 text-sm text-text-faint max-w-xs text-center">
            Claude Code, Cursor 등에서 MCP로 연결하거나<br />직접 프로젝트를 업로드하세요
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Link href="/guide">
              <Button variant="secondary" size="sm">
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                가이드 보기
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="primary" size="sm">
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                MCP 설정
              </Button>
            </Link>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default py-12">
          <p className="text-sm text-text-muted">해당 상태의 프로젝트가 없습니다</p>
          <button
            onClick={() => setActiveFilter("all")}
            className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            전체 보기
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project, idx) => {
            const techStack = extractTechNames(project.tech_summary);
            return (
              <div
                key={project.id}
                className="animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <ProjectCard
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  status={project.status}
                  techStack={techStack}
                  updatedAt={project.updated_at}
                />
              </div>
            );
          })}
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="analysis"
      />
    </div>
  );
}

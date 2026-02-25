"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TechStackBadge } from "@/components/features/tech-stack-badge";
import {
  startAnalysis,
  getProjectStatus,
  getProjectDetail,
} from "@/server/actions/projects";
import type { ProjectDetailData } from "@/server/actions/projects";
import { invalidateCache } from "@/lib/hooks/use-cached-fetch";

interface TechStackItem {
  id: string;
  technology_name: string;
  category: string;
  subcategory: string | null;
  version: string | null;
  confidence_score: number;
  importance: string;
  description: string | null;
}

interface ProjectAnalysisProps {
  projectId: string;
  initialStatus: string;
  initialTechStacks: TechStackItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  framework: "Framework",
  language: "Language",
  database: "Database",
  auth: "Authentication",
  deploy: "Deployment",
  styling: "Styling",
  testing: "Testing",
  build_tool: "Build Tool",
  library: "Library",
  other: "Other",
};

const CATEGORY_ORDER: string[] = [
  "framework",
  "language",
  "database",
  "auth",
  "deploy",
  "styling",
  "testing",
  "build_tool",
  "library",
  "other",
];

const IMPORTANCE_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  core: {
    label: "Core",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  supporting: {
    label: "Supporting",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  dev_dependency: {
    label: "Dev",
    className:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

function getConfidenceColor(score: number): string {
  if (score >= 0.8) return "bg-green-500 dark:bg-green-400";
  if (score >= 0.6) return "bg-yellow-500 dark:bg-yellow-400";
  if (score >= 0.4) return "bg-orange-500 dark:bg-orange-400";
  return "bg-red-500 dark:bg-red-400";
}

function getConfidenceLabel(score: number): string {
  if (score >= 0.8) return "High";
  if (score >= 0.6) return "Medium";
  if (score >= 0.4) return "Low";
  return "Very Low";
}

function groupByCategory(
  techStacks: TechStackItem[],
): Map<string, TechStackItem[]> {
  const groups = new Map<string, TechStackItem[]>();

  for (const category of CATEGORY_ORDER) {
    const items = techStacks.filter((t) => t.category === category);
    if (items.length > 0) {
      groups.set(category, items);
    }
  }

  // Add any categories not in CATEGORY_ORDER
  const knownCategories = new Set(CATEGORY_ORDER);
  for (const tech of techStacks) {
    if (!knownCategories.has(tech.category)) {
      const existing = groups.get(tech.category) ?? [];
      existing.push(tech);
      groups.set(tech.category, existing);
    }
  }

  return groups;
}

const POLL_INTERVAL = 3000;

export function ProjectAnalysis({
  projectId,
  initialStatus,
  initialTechStacks,
}: ProjectAnalysisProps) {
  const [status, setStatus] = useState(initialStatus);
  const [techStacks, setTechStacks] = useState(initialTechStacks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshProjectData = useCallback(async () => {
    const result = await getProjectDetail(projectId);
    if (result.success && result.data) {
      const detailData: ProjectDetailData = result.data;
      setStatus(detailData.project.status);
      setTechStacks(detailData.techStacks);
    }
  }, [projectId]);

  const pollStatus = useCallback(async () => {
    const result = await getProjectStatus(projectId);
    if (result.success && result.status) {
      setStatus(result.status);

      if (result.status === "analyzed" || result.status === "error") {
        stopPolling();
        // Refresh full data when analysis completes
        if (result.status === "analyzed") {
          invalidateCache("/api/dashboard");
          invalidateCache("/api/projects");
          await refreshProjectData();
        }
      }
    }
  }, [projectId, stopPolling, refreshProjectData]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      pollStatus();
    }, POLL_INTERVAL);
  }, [stopPolling, pollStatus]);

  // Start polling if initial status is analyzing
  useEffect(() => {
    if (status === "analyzing") {
      startPolling();
    }
    return () => {
      stopPolling();
    };
  }, [status, startPolling, stopPolling]);

  async function handleStartAnalysis() {
    setError(null);
    setLoading(true);

    const result = await startAnalysis(projectId);

    if (result.success) {
      setStatus("analyzing");
      startPolling();
    } else {
      setError(result.error ?? "분석을 시작할 수 없습니다");
    }
    setLoading(false);
  }

  async function handleRetry() {
    setError(null);
    await handleStartAnalysis();
  }

  // Uploaded state: show start button
  if (status === "uploaded" || status === "created") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <CardTitle>기술 스택 분석</CardTitle>
          </div>
          <CardDescription>
            AI가 프로젝트 파일을 분석하여 기술 스택을 자동으로 감지합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
              <Play className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                분석 준비 완료
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                업로드된 파일을 기반으로 기술 스택을 분석합니다
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <Button
              onClick={handleStartAnalysis}
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              분석 시작
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Analyzing state: show loading
  if (status === "analyzing") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <CardTitle>기술 스택 분석</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                분석 중...
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                AI가 프로젝트 파일을 분석하고 있습니다. 잠시 기다려주세요.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div className="h-full animate-pulse rounded-full bg-blue-500 transition-all dark:bg-blue-400" style={{ width: "60%" }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state: show error with retry
  if (status === "error") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <CardTitle>기술 스택 분석</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                분석 중 오류가 발생했습니다
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {error ?? "분석 과정에서 문제가 발생했습니다. 다시 시도해주세요."}
              </p>
            </div>
            <Button
              onClick={handleRetry}
              disabled={loading}
              variant="secondary"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Analyzed state: show results
  const grouped = groupByCategory(techStacks);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <CardTitle>기술 스택 분석 결과</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            disabled={loading}
            title="재분석"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          총 {techStacks.length}개의 기술이 감지되었습니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {techStacks.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            감지된 기술 스택이 없습니다
          </p>
        ) : (
          <>
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              {techStacks.map((tech) => (
                <TechStackBadge
                  key={tech.id}
                  name={`${tech.technology_name}${tech.version ? ` v${tech.version}` : ""}`}
                />
              ))}
            </div>

            {/* Detailed breakdown by category */}
            <div className="space-y-4">
              {Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category}>
                  <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    <ChevronRight className="h-4 w-4" />
                    {CATEGORY_LABELS[category] ?? category}
                    <span className="ml-1 text-xs font-normal text-zinc-400">
                      ({items.length})
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {items.map((tech) => {
                      const importance =
                        IMPORTANCE_STYLES[tech.importance] ??
                        IMPORTANCE_STYLES.dev_dependency;
                      const confidencePercent = Math.round(
                        tech.confidence_score * 100,
                      );

                      return (
                        <div
                          key={tech.id}
                          className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {tech.technology_name}
                                </span>
                                {tech.version && (
                                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                                    v{tech.version}
                                  </span>
                                )}
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${importance.className}`}
                                >
                                  {importance.label}
                                </span>
                              </div>
                              {tech.description && (
                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                  {tech.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Confidence bar */}
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1">
                              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                                <div
                                  className={`h-full rounded-full transition-all ${getConfidenceColor(tech.confidence_score)}`}
                                  style={{
                                    width: `${confidencePercent}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                              {confidencePercent}% {getConfidenceLabel(tech.confidence_score)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

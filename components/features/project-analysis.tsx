"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Play,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Layers,
  ChevronRight,
  CheckCircle2,
  X,
  FileUp,
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
  fileCount: number;
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
    className: "bg-violet-500/10 text-violet-300 border border-violet-500/20",
  },
  supporting: {
    label: "Supporting",
    className: "bg-green-500/10 text-green-300 border border-green-500/20",
  },
  dev_dependency: {
    label: "Dev",
    className: "bg-zinc-500/10 text-text-muted border border-zinc-500/20",
  },
};

function getConfidenceColor(score: number): string {
  if (score >= 0.8) return "bg-green-400";
  if (score >= 0.6) return "bg-amber-400";
  if (score >= 0.4) return "bg-orange-400";
  return "bg-red-400";
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

function getErrorGuidanceKey(errorMessage: string): string | null {
  const lower = errorMessage.toLowerCase();
  if (lower.includes("llm") || lower.includes("api key") || lower.includes("api 키") || lower.includes("decrypt") || lower.includes("encryption")) {
    return "analysis.errorGuidanceLlm";
  }
  if (lower.includes("file") || lower.includes("파일") || lower.includes("no files") || lower.includes("load project files")) {
    return "analysis.errorGuidanceFile";
  }
  return null;
}

export function ProjectAnalysis({
  projectId,
  initialStatus,
  initialTechStacks,
  fileCount,
}: ProjectAnalysisProps) {
  const t = useTranslations('Projects');
  const [status, setStatus] = useState(initialStatus);
  const [techStacks, setTechStacks] = useState(initialTechStacks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef(initialStatus);

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
      const previousStatus = prevStatusRef.current;
      setStatus(result.status);
      prevStatusRef.current = result.status;

      if (result.status === "analyzed" || result.status === "error") {
        stopPolling();

        if (result.status === "analyzed") {
          // Show completion banner when transitioning from analyzing to analyzed
          if (previousStatus === "analyzing") {
            setShowCompletionBanner(true);
          }
          invalidateCache("/api/dashboard");
          invalidateCache("/api/projects");
          await refreshProjectData();
        }

        if (result.status === "error" && result.errorMessage) {
          setError(result.errorMessage);
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

  // Fetch error message on mount if initial status is error
  useEffect(() => {
    if (initialStatus === "error" && !error) {
      getProjectStatus(projectId).then((result) => {
        if (result.success && result.errorMessage) {
          setError(result.errorMessage);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartAnalysis() {
    setError(null);
    setLoading(true);

    const result = await startAnalysis(projectId);

    if (result.success) {
      setStatus("analyzing");
      startPolling();
    } else {
      setError(result.error ?? t('analysis.startError'));
    }
    setLoading(false);
  }

  async function handleRetry() {
    setError(null);
    await handleStartAnalysis();
  }

  // Uploaded state: show start button
  if (status === "uploaded" || status === "created") {
    const hasNoFiles = fileCount === 0;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-text-muted" />
            <CardTitle>{t('analysis.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('analysis.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            {hasNoFiles ? (
              <>
                <div className="rounded-full bg-amber-500/10 p-4">
                  <FileUp className="h-8 w-8 text-amber-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-text-primary">
                    {t('analysis.noFiles')}
                  </p>
                  <p className="mt-1 text-sm text-text-muted whitespace-pre-line">
                    {t('analysis.noFilesDescription')}
                  </p>
                </div>
                <Button
                  disabled
                  size="lg"
                  title={t('analysis.uploadFirst')}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t('analysis.startButton')}
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-full bg-violet-500/10 p-4">
                  <Play className="h-8 w-8 text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-text-primary">
                    {t('analysis.readyTitle')}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {t('analysis.readyDescription', { count: fileCount })}
                  </p>
                </div>
                {error && (
                  <p className="text-sm text-red-400">
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
                  {t('analysis.startButton')}
                </Button>
              </>
            )}
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
            <Layers className="h-5 w-5 text-text-muted" />
            <CardTitle>{t('analysis.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="rounded-full bg-violet-500/10 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium text-text-primary">
                {t('analysis.analyzingTitle')}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {t('analysis.analyzingDescription')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-bg-surface-hover">
                <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all" style={{ width: "60%" }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state: show error with retry
  if (status === "error") {
    const guidanceKey = error ? getErrorGuidanceKey(error) : null;
    const displayError = error
      ? (guidanceKey ? t(guidanceKey) : error)
      : t("analysis.defaultError");

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-text-muted" />
            <CardTitle>{t('analysis.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-red-500/10 p-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-text-primary">
                {t('analysis.errorTitle')}
              </p>
              <p className="mt-1 text-sm text-text-muted max-w-md">
                {displayError}
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
              {t('analysis.retry')}
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
      {/* Completion banner */}
      {showCompletionBanner && (
        <div className="flex items-center justify-between gap-3 border-b border-green-500/20 bg-green-500/10 px-4 py-3 animate-slide-up">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
            <p className="text-sm font-medium text-green-300">
              {t('analysis.completedBanner')}
            </p>
          </div>
          <button
            onClick={() => setShowCompletionBanner(false)}
            className="text-green-400/60 hover:text-green-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-text-muted" />
            <CardTitle>{t('analysis.resultTitle')}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            disabled={loading}
            title={t('analysis.reanalyze')}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          {t('analysis.techCount', { count: techStacks.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {techStacks.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            {t('analysis.noTechStacks')}
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
                  <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-tertiary">
                    <ChevronRight className="h-4 w-4" />
                    {CATEGORY_LABELS[category] ?? category}
                    <span className="ml-1 text-xs font-normal text-text-faint">
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
                          className="rounded-xl border border-border-default bg-bg-surface p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-text-primary">
                                  {tech.technology_name}
                                </span>
                                {tech.version && (
                                  <span className="rounded bg-bg-surface-hover px-1.5 py-0.5 text-xs text-text-muted font-mono">
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
                                <p className="mt-1 text-sm text-text-muted">
                                  {tech.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Confidence bar */}
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1">
                              <div className="h-1.5 overflow-hidden rounded-full bg-bg-surface-hover">
                                <div
                                  className={`h-full rounded-full transition-all ${getConfidenceColor(tech.confidence_score)}`}
                                  style={{
                                    width: `${confidencePercent}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="shrink-0 text-xs text-text-faint">
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

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/features/upgrade-modal";
import { generateLearningPath } from "@/server/actions/learning";
import { createClient } from "@/lib/supabase/client";
import { invalidateCache } from "@/lib/hooks/use-cached-fetch";
import type { UsageData } from "@/server/actions/usage";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface ProjectOption {
  id: string;
  name: string;
  status: string;
}

interface GenerateResult {
  learning_path_id: string;
  title: string;
  total_modules: number;
  first_module_id: string | null;
}

const DIFFICULTY_OPTIONS: Array<{
  value: Difficulty;
  label: string;
  description: string;
}> = [
  {
    value: "beginner",
    label: "Beginner",
    description: "기초 개념부터 차근차근",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "핵심 개념과 실전 활용",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "심화 패턴과 최적화",
  },
];

interface LearningGeneratorProps {
  hasExistingPaths?: boolean;
}

export function LearningGenerator({ hasExistingPaths = false }: LearningGeneratorProps) {
  const [expanded, setExpanded] = useState(!hasExistingPaths);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [remainingPaths, setRemainingPaths] = useState<number | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("projects")
        .select("id, name, status")
        .eq("user_id", user.id)
        .eq("status", "analyzed")
        .order("updated_at", { ascending: false });

      if (data) {
        setProjects(data as ProjectOption[]);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch {
      // Ignore errors for loading
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Fetch usage data on mount
  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/usage");
        const json = await res.json();
        if (json.success && json.data) {
          const data = json.data as UsageData;
          if (data.learningPaths.limit === null) {
            setIsUnlimited(true);
          } else {
            setRemainingPaths(
              Math.max(data.learningPaths.limit - data.learningPaths.used, 0),
            );
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }
    fetchUsage();
  }, []);

  async function handleGenerate() {
    if (!selectedProjectId) {
      setError("프로젝트를 선택해주세요");
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await generateLearningPath(
        selectedProjectId,
        difficulty,
      );

      if (response.success && response.data) {
        setResult(response.data);
        invalidateCache("/api/dashboard");
        invalidateCache("/api/learning");
        if (remainingPaths !== null) {
          setRemainingPaths((prev) => (prev !== null ? Math.max(prev - 1, 0) : null));
        }
      } else {
        const errMsg = response.error ?? "로드맵 생성에 실패했습니다";
        if (errMsg.toLowerCase().includes("limit") || errMsg.includes("한도")) {
          setShowUpgradeModal(true);
        }
        setError(errMsg);
      }
    } catch {
      setError("로드맵 생성 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/[0.03] p-6">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-text-primary">
              로드맵이 생성되었습니다!
            </p>
            <p className="mt-1 text-sm text-text-muted">
              &ldquo;{result.title}&rdquo; — 총 {result.total_modules}개 모듈
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={
                result.first_module_id
                  ? `/learning/${result.learning_path_id}/${result.first_module_id}`
                  : `/learning/${result.learning_path_id}`
              }
            >
              <Button>
                <GraduationCap className="mr-2 h-4 w-4" />
                학습 시작
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
            >
              다른 로드맵 생성
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden">
      {/* Header (clickable to toggle) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-sm">새 학습 로드맵 생성</h3>
            <p className="text-xs text-text-faint">분석된 프로젝트를 기반으로 AI 맞춤 커리큘럼</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-text-faint transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-border-default px-5 py-5 space-y-4">
          {/* Project selector */}
          <div>
            <label
              htmlFor="project-select"
              className="mb-1.5 block text-sm font-medium text-text-tertiary"
            >
              프로젝트 선택
            </label>
            {loadingProjects ? (
              <div className="flex h-10 items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                프로젝트 목록을 불러오는 중...
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-default p-4 text-center">
                <p className="text-sm text-text-muted">
                  분석 완료된 프로젝트가 없습니다
                </p>
                <Link href="/projects" className="mt-2 inline-block">
                  <Button variant="secondary" size="sm">
                    프로젝트 관리로 이동
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex h-10 w-full appearance-none rounded-xl border border-border-default bg-bg-input px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/40 transition-all duration-200"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id} className="bg-bg-elevated">
                      {project.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            )}
          </div>

          {/* Difficulty selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-tertiary">
              난이도
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDifficulty(option.value)}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    difficulty === option.value
                      ? "border-violet-500/40 bg-violet-500/10 text-text-primary"
                      : "border-border-default bg-bg-surface text-text-tertiary hover:border-border-hover"
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {option.label}
                  </span>
                  <span
                    className={`block text-xs ${
                      difficulty === option.value
                        ? "text-violet-300"
                        : "text-text-faint"
                    }`}
                  >
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Usage hint */}
          {!isUnlimited && remainingPaths !== null && (
            <p className="text-xs text-text-faint">
              남은 로드맵 생성: {remainingPaths}회
            </p>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !selectedProjectId || projects.length === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI가 로드맵을 생성하는 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                생성하기
              </>
            )}
          </Button>
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="learning"
      />
    </div>
  );
}

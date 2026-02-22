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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { generateLearningPath } from "@/server/actions/learning";
import { createClient } from "@/lib/supabase/client";

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

export function LearningGenerator() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

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
      } else {
        setError(response.error ?? "로드맵 생성에 실패했습니다");
      }
    } catch {
      setError("알 수 없는 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                로드맵이 생성되었습니다!
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                &ldquo;{result.title}&rdquo; — 총 {result.total_modules}개 모듈
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/learning/${result.learning_path_id}`}>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <CardTitle>새 로드맵 생성</CardTitle>
        </div>
        <CardDescription>
          분석된 프로젝트를 기반으로 AI가 맞춤 학습 로드맵을 생성합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project selector */}
        <div>
          <label
            htmlFor="project-select"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            프로젝트 선택
          </label>
          {loadingProjects ? (
            <div className="flex h-10 items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              프로젝트 목록을 불러오는 중...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                className="flex h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-8 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-300"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>
          )}
        </div>

        {/* Difficulty selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            난이도
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDifficulty(option.value)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  difficulty === option.value
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span
                  className={`block text-xs ${
                    difficulty === option.value
                      ? "text-zinc-300 dark:text-zinc-600"
                      : "text-zinc-400 dark:text-zinc-500"
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
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
      </CardContent>
    </Card>
  );
}

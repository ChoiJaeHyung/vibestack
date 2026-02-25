import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { LearningPathCard } from "@/components/features/learning-path-card";
import { LearningGenerator } from "@/components/features/learning-generator";

interface LearningPathRow {
  id: string;
  title: string;
  description: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  estimated_hours: number | null;
  total_modules: number;
  status: string;
  created_at: string;
  project_id: string;
  projects: { name: string } | null;
}

interface ProgressData {
  completedByPath: Map<string, number>;
}

export default async function LearningPage() {
  let paths: LearningPathRow[] = [];
  let progressData: ProgressData = {
    completedByPath: new Map(),
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("learning_paths")
        .select(
          "id, title, description, difficulty, estimated_hours, total_modules, status, created_at, project_id, projects(name)",
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (data) {
        paths = data as unknown as LearningPathRow[];
      }

      // Batch query: get all modules + completed progress at once (was N+1)
      if (paths.length > 0) {
        const pathIds = paths.map((p) => p.id);

        // Single query for all modules across all paths
        const { data: allModules } = await supabase
          .from("learning_modules")
          .select("id, learning_path_id")
          .in("learning_path_id", pathIds);

        const completedByPath = new Map<string, number>();
        for (const path of paths) {
          completedByPath.set(path.id, 0);
        }

        if (allModules && allModules.length > 0) {
          // Build module→path lookup
          const moduleToPath = new Map<string, string>();
          for (const m of allModules) {
            moduleToPath.set(m.id, m.learning_path_id);
          }

          // Single query for all completed progress
          const allModuleIds = allModules.map((m) => m.id);
          const { data: completed } = await supabase
            .from("learning_progress")
            .select("module_id")
            .eq("user_id", user.id)
            .in("module_id", allModuleIds)
            .eq("status", "completed");

          if (completed) {
            for (const row of completed) {
              const pathId = moduleToPath.get(row.module_id);
              if (pathId) {
                const current = completedByPath.get(pathId) ?? 0;
                completedByPath.set(pathId, current + 1);
              }
            }
          }
        }

        progressData = { completedByPath };
      }
    }
  } catch {
    // Supabase not configured
  }

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
                completedModules={
                  progressData.completedByPath.get(path.id) ?? 0
                }
                status={path.status}
                projectName={path.projects?.name ?? null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

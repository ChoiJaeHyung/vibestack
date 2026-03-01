import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";

// ─── Types (exported for client components) ─────────────────────────

interface LearningPathProject {
  name: string;
}

export interface LearningPathItem {
  id: string;
  title: string;
  description: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  estimated_hours: number | null;
  total_modules: number;
  status: string;
  created_at: string;
  project_id: string;
  projectName: string | null;
  completedModules: number;
}

export interface AnalyzedProject {
  id: string;
  name: string;
  status: string;
}

export interface LearningPathsData {
  paths: LearningPathItem[];
  analyzedProjects: AnalyzedProject[];
}

// ─── GET handler ────────────────────────────────────────────────────

export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    // ── Parallel: fetch paths + analyzed projects ───────────────────
    const [pathsResult, analyzedProjectsResult] = await Promise.all([
      supabase
        .from("learning_paths")
        .select(
          "id, title, description, difficulty, estimated_hours, total_modules, status, created_at, project_id, projects(name)",
        )
        .eq("user_id", authUser.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name, status")
        .eq("user_id", authUser.id)
        .eq("status", "analyzed")
        .order("updated_at", { ascending: false }),
    ]);

    const rawPaths = (pathsResult.data ?? []) as unknown as Array<{
      id: string;
      title: string;
      description: string | null;
      difficulty: "beginner" | "intermediate" | "advanced" | null;
      estimated_hours: number | null;
      total_modules: number;
      status: string;
      created_at: string;
      project_id: string;
      projects: LearningPathProject | null;
    }>;

    // ── Batch progress queries (avoid N+1) ──────────────────────────
    const completedByPath = new Map<string, number>();
    for (const path of rawPaths) {
      completedByPath.set(path.id, 0);
    }

    if (rawPaths.length > 0) {
      const pathIds = rawPaths.map((p) => p.id);

      // Single query for all modules across all paths
      const { data: allModules } = await supabase
        .from("learning_modules")
        .select("id, learning_path_id")
        .in("learning_path_id", pathIds);

      if (allModules && allModules.length > 0) {
        const moduleToPath = new Map<string, string>();
        for (const m of allModules) {
          moduleToPath.set(m.id, m.learning_path_id);
        }

        // Single query for all completed progress
        const allModuleIds = allModules.map((m) => m.id);
        const { data: completed } = await supabase
          .from("learning_progress")
          .select("module_id")
          .eq("user_id", authUser.id)
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
    }

    // ── Build response ──────────────────────────────────────────────
    const paths: LearningPathItem[] = rawPaths.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      estimated_hours: p.estimated_hours,
      total_modules: p.total_modules,
      status: p.status,
      created_at: p.created_at,
      project_id: p.project_id,
      projectName: p.projects?.name ?? null,
      completedModules: completedByPath.get(p.id) ?? 0,
    }));

    const analyzedProjects: AnalyzedProject[] = (
      analyzedProjectsResult.data ?? []
    ).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
    }));

    const data: LearningPathsData = { paths, analyzedProjects };

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

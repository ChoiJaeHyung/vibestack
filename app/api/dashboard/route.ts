import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

// ─── Types (exported for client components) ─────────────────────────

interface RecentProject {
  id: string;
  name: string;
  status: string;
  source_platform: string | null;
  tech_summary: Json | null;
  updated_at: string;
}

interface TechDistributionItem {
  category: string;
  count: number;
}

interface CurrentLearning {
  moduleId: string;
  moduleTitle: string;
  pathId: string;
  pathTitle: string;
}

export interface DashboardData {
  totalProjects: number;
  uniqueTechnologies: number;
  learningProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  monthlyChats: number;
  recentProjects: RecentProject[];
  techDistribution: TechDistributionItem[];
  currentLearning: CurrentLearning | null;
  userEmail: string;
  usage: {
    projects: { used: number; limit: number | null };
    learningPaths: { used: number; limit: number | null };
    aiChats: { used: number; limit: number | null };
    planType: "free" | "pro" | "team";
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

const FREE_LIMITS = {
  projects: 3,
  learningPaths: 1,
  aiChats: 20,
};

function getStartOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// ─── GET handler ────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const startOfMonth = getStartOfMonth();

    // ── Single batch of parallel queries ────────────────────────────
    const [
      { count: totalProjects },
      { data: recentProjectsData },
      { data: learningPaths },
      { count: monthlyChats },
      userResult,
      learningPathCountResult,
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("projects")
        .select("id, name, status, source_platform, tech_summary, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("learning_paths")
        .select("id, title, total_modules")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase
        .from("ai_conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth),
      supabase
        .from("users")
        .select("plan_type")
        .eq("id", user.id)
        .single(),
      supabase
        .from("learning_paths")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth),
    ]);

    // ── Phase 2: Dependent queries ──────────────────────────────────
    const recentProjectIds = (recentProjectsData ?? []).map((p) => p.id);
    const hasLearningPaths = learningPaths && learningPaths.length > 0;
    const pathIds = hasLearningPaths ? learningPaths.map((lp) => lp.id) : [];

    const [techResult, moduleResult, inProgressResult] = await Promise.all([
      recentProjectIds.length > 0
        ? supabase
            .from("tech_stacks")
            .select("id, category, project_id")
            .in("project_id", recentProjectIds)
        : Promise.resolve({ data: null } as { data: null }),
      hasLearningPaths
        ? supabase
            .from("learning_modules")
            .select("id")
            .in("learning_path_id", pathIds)
        : Promise.resolve({ data: null } as { data: null }),
      hasLearningPaths
        ? supabase
            .from("learning_progress")
            .select("module_id")
            .eq("user_id", user.id)
            .eq("status", "in_progress")
            .limit(1)
        : Promise.resolve({ data: null } as { data: null }),
    ]);

    // ── Tech data with fallback ─────────────────────────────────────
    let allTechData = techResult.data;
    if (!allTechData || allTechData.length === 0) {
      if ((totalProjects ?? 0) > 0) {
        const { data: allProjectIds } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", user.id);

        if (allProjectIds && allProjectIds.length > 0) {
          const { data: allTech } = await supabase
            .from("tech_stacks")
            .select("id, category, project_id")
            .in(
              "project_id",
              allProjectIds.map((p) => p.id),
            );
          allTechData = allTech;
        }
      }
    }

    const uniqueTechNames = new Set((allTechData ?? []).map((t) => t.id));
    const uniqueTechnologies = uniqueTechNames.size;

    const categoryCountMap = new Map<string, number>();
    for (const tech of allTechData ?? []) {
      const current = categoryCountMap.get(tech.category) ?? 0;
      categoryCountMap.set(tech.category, current + 1);
    }
    const techDistribution: TechDistributionItem[] = Array.from(
      categoryCountMap.entries(),
    ).map(([category, count]) => ({ category, count }));

    // ── Phase 3: Learning stats + current learning ──────────────────
    const moduleIds = (moduleResult.data ?? []).map(
      (m: { id: string }) => m.id,
    );
    const totalModules = hasLearningPaths
      ? learningPaths.reduce((sum, lp) => sum + lp.total_modules, 0)
      : 0;

    const inProgressModules = inProgressResult.data as
      | { module_id: string }[]
      | null;

    const currentLearningPromise =
      inProgressModules && inProgressModules.length > 0
        ? supabase
            .from("learning_modules")
            .select("id, title, learning_path_id")
            .eq("id", inProgressModules[0].module_id)
            .limit(1)
        : hasLearningPaths
          ? supabase
              .from("learning_modules")
              .select("id, title, learning_path_id")
              .eq("learning_path_id", learningPaths[0].id)
              .order("module_order", { ascending: true })
              .limit(1)
          : Promise.resolve({ data: null } as { data: null });

    const [completedResult, currentModuleResult] = await Promise.all([
      moduleIds.length > 0
        ? supabase
            .from("learning_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("module_id", moduleIds)
            .eq("status", "completed")
        : Promise.resolve({ count: 0 } as { count: number }),
      currentLearningPromise,
    ]);

    const completedModules = completedResult.count ?? 0;
    const learningPercentage =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    let currentLearning: CurrentLearning | null = null;
    const currentModuleData = currentModuleResult.data as
      | { id: string; title: string; learning_path_id: string }[]
      | null;
    const currentModule = currentModuleData?.[0];
    if (currentModule) {
      const path = (learningPaths ?? []).find(
        (lp) => lp.id === currentModule.learning_path_id,
      );
      if (path) {
        currentLearning = {
          moduleId: currentModule.id,
          moduleTitle: currentModule.title,
          pathId: path.id,
          pathTitle: path.title,
        };
      }
    }

    const recentProjects: RecentProject[] = (recentProjectsData ?? []).map(
      (p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        source_platform: p.source_platform,
        tech_summary: p.tech_summary,
        updated_at: p.updated_at,
      }),
    );

    // ── Usage data ──────────────────────────────────────────────────
    const planType = ((userResult.data?.plan_type as string) ?? "free") as
      | "free"
      | "pro"
      | "team";
    const isFree = planType === "free";

    const dashboardData: DashboardData = {
      totalProjects: totalProjects ?? 0,
      uniqueTechnologies,
      learningProgress: {
        completed: completedModules,
        total: totalModules,
        percentage: learningPercentage,
      },
      monthlyChats: monthlyChats ?? 0,
      recentProjects,
      techDistribution,
      currentLearning,
      userEmail: user.email ?? "User",
      usage: {
        projects: {
          used: totalProjects ?? 0,
          limit: isFree ? FREE_LIMITS.projects : null,
        },
        learningPaths: {
          used: learningPathCountResult.count ?? 0,
          limit: isFree ? FREE_LIMITS.learningPaths : null,
        },
        aiChats: {
          used: monthlyChats ?? 0,
          limit: isFree ? FREE_LIMITS.aiChats : null,
        },
        planType,
      },
    };

    return NextResponse.json({ success: true, data: dashboardData });
  } catch {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

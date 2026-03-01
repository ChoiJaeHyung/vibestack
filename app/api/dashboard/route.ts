import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getAllBadges, getUserBadges } from "@/server/actions/badges";
import { getStreak } from "@/server/actions/streak";
import type { StreakData } from "@/server/actions/streak";
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

interface DashboardBadgeInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
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
  learnedToday: boolean;
  userEmail: string;
  usage: {
    projects: { used: number; limit: number | null };
    learningPaths: { used: number; limit: number | null };
    aiChats: { used: number; limit: number | null };
    planType: "free" | "pro" | "team";
  };
  badges: {
    all: DashboardBadgeInfo[];
    earnedSlugs: string[];
  };
  streak: StreakData;
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

function getStartOfToday(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
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
    const startOfMonth = getStartOfMonth();
    const startOfToday = getStartOfToday();

    // ── Phase 1: All independent queries in parallel ────────────────
    const [
      { count: totalProjects },
      { data: recentProjectsData },
      { data: learningPaths },
      { count: monthlyChats },
      userResult,
      learningPathCountResult,
      { data: allProjectIds },
      { data: allProgress },
      { count: todayProgressCount },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authUser.id),
      supabase
        .from("projects")
        .select("id, name, status, source_platform, tech_summary, updated_at")
        .eq("user_id", authUser.id)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("learning_paths")
        .select("id, title, total_modules")
        .eq("user_id", authUser.id)
        .eq("status", "active"),
      supabase
        .from("ai_conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authUser.id)
        .gte("created_at", startOfMonth),
      supabase
        .from("users")
        .select("plan_type")
        .eq("id", authUser.id)
        .single(),
      supabase
        .from("learning_paths")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authUser.id)
        .gte("created_at", startOfMonth),
      // All project IDs for tech stacks (eliminates Phase 3 fallback)
      supabase
        .from("projects")
        .select("id")
        .eq("user_id", authUser.id),
      // All learning progress for user (eliminates Phase 3 completed query)
      supabase
        .from("learning_progress")
        .select("module_id, status")
        .eq("user_id", authUser.id),
      // Check if user has any learning progress updated today
      supabase
        .from("learning_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authUser.id)
        .gte("updated_at", startOfToday),
    ]);

    // ── Phase 2: Queries that depend on Phase 1 results ─────────────
    const projectIds = (allProjectIds ?? []).map((p) => p.id);
    const hasLearningPaths = learningPaths && learningPaths.length > 0;
    const pathIds = hasLearningPaths ? learningPaths.map((lp) => lp.id) : [];

    const [techResult, moduleResult] = await Promise.all([
      projectIds.length > 0
        ? supabase
            .from("tech_stacks")
            .select("id, category, project_id")
            .in("project_id", projectIds)
        : Promise.resolve({ data: null } as { data: null }),
      hasLearningPaths
        ? supabase
            .from("learning_modules")
            .select("id, title, learning_path_id, module_order")
            .in("learning_path_id", pathIds)
        : Promise.resolve({ data: null } as { data: null }),
    ]);

    // ── Compute tech distribution ───────────────────────────────────
    const allTechData = techResult.data;
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

    // ── Compute learning stats from Phase 1 progress data ───────────
    const modules = (moduleResult.data ?? []) as {
      id: string;
      title: string;
      learning_path_id: string;
      module_order: number;
    }[];
    const moduleIdSet = new Set(modules.map((m) => m.id));
    const totalModules = hasLearningPaths
      ? learningPaths.reduce((sum, lp) => sum + lp.total_modules, 0)
      : 0;

    const progressData = allProgress ?? [];
    const completedModules = progressData.filter(
      (p) => p.status === "completed" && moduleIdSet.has(p.module_id),
    ).length;
    const learningPercentage =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    // ── Compute current learning from progress + modules data ───────
    let currentLearning: CurrentLearning | null = null;
    const inProgressModuleId = progressData.find(
      (p) => p.status === "in_progress" && moduleIdSet.has(p.module_id),
    )?.module_id;

    const currentModule = inProgressModuleId
      ? modules.find((m) => m.id === inProgressModuleId)
      : hasLearningPaths
        ? modules
            .filter((m) => m.learning_path_id === learningPaths[0].id)
            .sort((a, b) => a.module_order - b.module_order)[0]
        : undefined;

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

    // ── Badge + Streak data ──────────────────────────────────────────
    const [allBadgesData, earnedBadgesData, streakResult] = await Promise.all([
      getAllBadges(),
      getUserBadges(authUser.id),
      getStreak(authUser.id),
    ]);

    const badgesForDashboard = {
      all: allBadgesData.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: b.description,
        icon: b.icon,
      })),
      earnedSlugs: earnedBadgesData.map((b) => b.slug),
    };

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
      learnedToday: (todayProgressCount ?? 0) > 0,
      userEmail: authUser.email || "User",
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
      badges: badgesForDashboard,
      streak: streakResult.data ?? {
        currentStreak: 0,
        longestStreak: 0,
        weeklyTarget: 3,
        lastActiveDate: null,
        weekActiveDays: 0,
        weekStartDate: null,
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

"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

// ─── Response Types ──────────────────────────────────────────────────

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

interface DashboardStats {
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
}

interface DashboardStatsResult {
  success: boolean;
  data?: DashboardStats;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getStartOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// ─── Server Action ──────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStatsResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // 1. Total projects count
    const { count: totalProjects } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // 2. Recent projects (last 5)
    const { data: recentProjectsData } = await supabase
      .from("projects")
      .select("id, name, status, source_platform, tech_summary, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5);

    // 3. Unique technologies (count distinct categories)
    const { data: techData } = await supabase
      .from("tech_stacks")
      .select("id, category, project_id")
      .in(
        "project_id",
        (recentProjectsData ?? []).map((p) => p.id),
      );

    // If there are no recent projects, query all user projects for tech stats
    let allTechData = techData;
    if (!allTechData || allTechData.length === 0) {
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

    const uniqueTechNames = new Set((allTechData ?? []).map((t) => t.id));
    const uniqueTechnologies = uniqueTechNames.size;

    // 4. Tech distribution by category
    const categoryCountMap = new Map<string, number>();
    for (const tech of allTechData ?? []) {
      const current = categoryCountMap.get(tech.category) ?? 0;
      categoryCountMap.set(tech.category, current + 1);
    }

    const techDistribution: TechDistributionItem[] = Array.from(
      categoryCountMap.entries(),
    ).map(([category, count]) => ({ category, count }));

    // 5. Learning progress
    const { data: learningPaths } = await supabase
      .from("learning_paths")
      .select("id, total_modules")
      .eq("user_id", user.id)
      .eq("status", "active");

    let totalModules = 0;
    let completedModules = 0;

    if (learningPaths && learningPaths.length > 0) {
      totalModules = learningPaths.reduce((sum, lp) => sum + lp.total_modules, 0);

      const pathIds = learningPaths.map((lp) => lp.id);

      // Get all module IDs for these paths
      const { data: modules } = await supabase
        .from("learning_modules")
        .select("id")
        .in("learning_path_id", pathIds);

      if (modules && modules.length > 0) {
        const moduleIds = modules.map((m) => m.id);

        const { count: completedCount } = await supabase
          .from("learning_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("module_id", moduleIds)
          .eq("status", "completed");

        completedModules = completedCount ?? 0;
      }
    }

    const learningPercentage =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    // 6. Monthly chat count
    const startOfMonth = getStartOfMonth();
    const { count: monthlyChats } = await supabase
      .from("ai_conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth);

    // 7. Current learning (first in_progress module, or first not_started)
    let currentLearning: CurrentLearning | null = null;

    if (learningPaths && learningPaths.length > 0) {
      // Check for in_progress modules first
      const { data: inProgressModules } = await supabase
        .from("learning_progress")
        .select("module_id")
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .limit(1);

      if (inProgressModules && inProgressModules.length > 0) {
        const { data: moduleDetail } = await supabase
          .from("learning_modules")
          .select("id, title, learning_path_id")
          .eq("id", inProgressModules[0].module_id)
          .single();

        if (moduleDetail) {
          const { data: pathDetail } = await supabase
            .from("learning_paths")
            .select("id, title")
            .eq("id", moduleDetail.learning_path_id)
            .single();

          if (pathDetail) {
            currentLearning = {
              moduleId: moduleDetail.id,
              moduleTitle: moduleDetail.title,
              pathId: pathDetail.id,
              pathTitle: pathDetail.title,
            };
          }
        }
      }

      // If no in_progress, find first module without progress
      if (!currentLearning) {
        const activePath = learningPaths[0];
        const { data: firstModule } = await supabase
          .from("learning_modules")
          .select("id, title")
          .eq("learning_path_id", activePath.id)
          .order("module_order", { ascending: true })
          .limit(1);

        if (firstModule && firstModule.length > 0) {
          const { data: pathDetail } = await supabase
            .from("learning_paths")
            .select("id, title")
            .eq("id", activePath.id)
            .single();

          if (pathDetail) {
            currentLearning = {
              moduleId: firstModule[0].id,
              moduleTitle: firstModule[0].title,
              pathId: pathDetail.id,
              pathTitle: pathDetail.title,
            };
          }
        }
      }
    }

    const recentProjects: RecentProject[] = (recentProjectsData ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      source_platform: p.source_platform,
      tech_summary: p.tech_summary,
      updated_at: p.updated_at,
    }));

    return {
      success: true,
      data: {
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
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

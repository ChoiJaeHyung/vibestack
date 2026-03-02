"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkAndAwardBadges } from "@/server/actions/badges";
import type { NewlyEarnedBadge } from "@/server/actions/badges";
import { updateStreak } from "@/server/actions/streak";
import { updateMasteryFromModuleCompletion } from "@/server/actions/knowledge-graph";
import { awardPoints } from "@/server/actions/points";
import { POINT_AWARDS } from "@/server/actions/point-constants";
import type { ContentSection, ModuleContent } from "@/server/actions/curriculum";
import type { Database } from "@/types/database";

// ─── Type Aliases ────────────────────────────────────────────────────

type Difficulty = Database["public"]["Enums"]["difficulty"];
type ModuleType = Database["public"]["Enums"]["module_type"];
type LearningProgressInsert = Database["public"]["Tables"]["learning_progress"]["Insert"];
type LearningProgressUpdate = Database["public"]["Tables"]["learning_progress"]["Update"];

// ─── Response Types ──────────────────────────────────────────────────

interface LearningPathItem {
  id: string;
  title: string;
  description: string | null;
  difficulty: Difficulty | null;
  estimated_hours: number | null;
  total_modules: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LearningPathListResult {
  success: boolean;
  data?: LearningPathItem[];
  error?: string;
}

interface ModuleItem {
  id: string;
  title: string;
  description: string | null;
  module_type: ModuleType | null;
  module_order: number;
  estimated_minutes: number | null;
  tech_stack_id: string | null;
  progress?: {
    status: string;
    score: number | null;
    time_spent: number | null;
    completed_at: string | null;
  };
}

interface LearningPathDetail {
  id: string;
  title: string;
  description: string | null;
  difficulty: Difficulty | null;
  estimated_hours: number | null;
  total_modules: number;
  status: string;
  llm_provider: string | null;
  created_at: string;
  updated_at: string;
  modules: ModuleItem[];
}

interface LearningPathDetailResult {
  success: boolean;
  data?: LearningPathDetail;
  error?: string;
}

interface LearningModuleDetail {
  id: string;
  title: string;
  description: string | null;
  module_type: ModuleType | null;
  module_order: number;
  estimated_minutes: number | null;
  tech_stack_id: string | null;
  content: ModuleContent;
  learning_path_id: string;
  progress?: {
    status: string;
    score: number | null;
    time_spent: number | null;
    attempts: number;
    completed_at: string | null;
  };
}

interface LearningModuleDetailResult {
  success: boolean;
  data?: LearningModuleDetail;
  error?: string;
}

interface UpdateProgressResult {
  success: boolean;
  error?: string;
  newBadges?: NewlyEarnedBadge[];
  pointsEarned?: number;
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function getLearningPaths(
  projectId: string,
): Promise<LearningPathListResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    const { data, error } = await supabase
      .from("learning_paths")
      .select(
        "id, title, description, difficulty, estimated_hours, total_modules, status, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch learning paths" };
    }

    return { success: true, data: (data ?? []) as LearningPathItem[] };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getLearningPathDetail(
  pathId: string,
): Promise<LearningPathDetailResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch learning path
    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select(
        "id, title, description, difficulty, estimated_hours, total_modules, status, llm_provider, created_at, updated_at",
      )
      .eq("id", pathId)
      .eq("user_id", user.id)
      .single();

    if (pathError || !path) {
      return { success: false, error: "Learning path not found" };
    }

    // Fetch modules
    const { data: modules, error: modulesError } = await supabase
      .from("learning_modules")
      .select(
        "id, title, description, module_type, module_order, estimated_minutes, tech_stack_id",
      )
      .eq("learning_path_id", pathId)
      .order("module_order", { ascending: true });

    if (modulesError) {
      return { success: false, error: "Failed to fetch modules" };
    }

    // Fetch progress for all modules
    const moduleIds = (modules ?? []).map((m) => m.id);
    let progressMap = new Map<
      string,
      {
        status: string;
        score: number | null;
        time_spent: number | null;
        completed_at: string | null;
      }
    >();

    if (moduleIds.length > 0) {
      const { data: progressData } = await supabase
        .from("learning_progress")
        .select("module_id, status, score, time_spent, completed_at")
        .eq("user_id", user.id)
        .in("module_id", moduleIds);

      if (progressData) {
        progressMap = new Map(
          progressData.map((p) => [
            p.module_id,
            {
              status: p.status,
              score: p.score,
              time_spent: p.time_spent,
              completed_at: p.completed_at,
            },
          ]),
        );
      }
    }

    const modulesWithProgress: ModuleItem[] = (modules ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      module_type: m.module_type,
      module_order: m.module_order,
      estimated_minutes: m.estimated_minutes,
      tech_stack_id: m.tech_stack_id,
      progress: progressMap.get(m.id),
    }));

    return {
      success: true,
      data: {
        id: path.id,
        title: path.title,
        description: path.description,
        difficulty: path.difficulty,
        estimated_hours: path.estimated_hours,
        total_modules: path.total_modules,
        status: path.status,
        llm_provider: path.llm_provider,
        created_at: path.created_at,
        updated_at: path.updated_at,
        modules: modulesWithProgress,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getLearningModule(
  moduleId: string,
): Promise<LearningModuleDetailResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch the module
    const { data: moduleData, error: moduleError } = await supabase
      .from("learning_modules")
      .select(
        "id, title, description, module_type, module_order, estimated_minutes, tech_stack_id, content, learning_path_id",
      )
      .eq("id", moduleId)
      .single();

    if (moduleError || !moduleData) {
      return { success: false, error: "Module not found" };
    }

    // Verify user owns the learning path
    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", moduleData.learning_path_id)
      .eq("user_id", user.id)
      .single();

    if (pathError || !path) {
      return { success: false, error: "Learning path not found" };
    }

    // Fetch progress for this module
    const { data: progressData } = await supabase
      .from("learning_progress")
      .select("status, score, time_spent, attempts, completed_at")
      .eq("module_id", moduleId)
      .eq("user_id", user.id)
      .single();

    const progress = progressData
      ? {
          status: progressData.status,
          score: progressData.score,
          time_spent: progressData.time_spent,
          attempts: progressData.attempts,
          completed_at: progressData.completed_at,
        }
      : undefined;

    return {
      success: true,
      data: {
        id: moduleData.id,
        title: moduleData.title,
        description: moduleData.description,
        module_type: moduleData.module_type,
        module_order: moduleData.module_order,
        estimated_minutes: moduleData.estimated_minutes,
        tech_stack_id: moduleData.tech_stack_id,
        content: moduleData.content as unknown as ModuleContent,
        learning_path_id: moduleData.learning_path_id,
        progress,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateLearningProgress(
  moduleId: string,
  status: "in_progress" | "completed" | "skipped",
  score?: number,
  timeSpent?: number,
): Promise<UpdateProgressResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the module exists and user owns the learning path
    const { data: moduleData, error: moduleError } = await supabase
      .from("learning_modules")
      .select("id, learning_path_id")
      .eq("id", moduleId)
      .single();

    if (moduleError || !moduleData) {
      return { success: false, error: "Module not found" };
    }

    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", moduleData.learning_path_id)
      .eq("user_id", user.id)
      .single();

    if (pathError || !path) {
      return { success: false, error: "Learning path not found" };
    }

    // Check if progress record already exists
    const { data: existing } = await supabase
      .from("learning_progress")
      .select("id, attempts, score, time_spent")
      .eq("module_id", moduleId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Update existing progress — keep best score, accumulate time
      const progressUpdate: LearningProgressUpdate = {
        status,
        score: score !== undefined
          ? (existing.score !== null ? Math.max(score, Number(existing.score)) : score)
          : (existing.score ?? null),
        time_spent: timeSpent !== undefined
          ? ((existing.time_spent ?? 0) + timeSpent)
          : (existing.time_spent ?? null),
        attempts: existing.attempts + 1,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("learning_progress")
        .update(progressUpdate)
        .eq("id", existing.id)
        .eq("user_id", user.id);

      if (updateError) {
        return { success: false, error: "Failed to update progress" };
      }
    } else {
      // Insert new progress record using service client
      const serviceClient = createServiceClient();

      const progressInsert: LearningProgressInsert = {
        user_id: user.id,
        module_id: moduleId,
        status,
        score: score ?? null,
        time_spent: timeSpent ?? null,
        attempts: 1,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      };

      const { error: insertError } = await serviceClient
        .from("learning_progress")
        .insert(progressInsert);

      if (insertError) {
        return { success: false, error: "Failed to create progress record" };
      }
    }

    // ── Streak + Badge + Mastery + Points on module completion ──────────
    if (status === "completed") {
      // Update streak (fire-and-forget, non-blocking)
      updateStreak(user.id).catch(() => {});

      // Update concept mastery (fire-and-forget, non-blocking)
      updateMasteryFromModuleCompletion(user.id, moduleId, score).catch(() => {});

      // Award points for module completion
      // Note: awardPoints returns { success: true } without newBalance when point system is disabled.
      // We check newBalance !== undefined to avoid showing phantom points in the UI.
      let pointsEarned = 0;
      try {
        const baseResult = await awardPoints(user.id, POINT_AWARDS.MODULE_COMPLETE, "module_complete", moduleId, "learning_module");
        if (baseResult.success && baseResult.newBalance !== undefined) pointsEarned += POINT_AWARDS.MODULE_COMPLETE;

        if (score !== undefined && score >= 100) {
          const bonusResult = await awardPoints(user.id, POINT_AWARDS.QUIZ_SCORE_100, "quiz_perfect", moduleId, "learning_module");
          if (bonusResult.success && bonusResult.newBalance !== undefined) pointsEarned += POINT_AWARDS.QUIZ_SCORE_100;
        } else if (score !== undefined && score >= 80) {
          const bonusResult = await awardPoints(user.id, POINT_AWARDS.QUIZ_SCORE_80, "quiz_high_score", moduleId, "learning_module");
          if (bonusResult.success && bonusResult.newBalance !== undefined) pointsEarned += POINT_AWARDS.QUIZ_SCORE_80;
        }
      } catch {
        // Point award failure should not block progress update
      }

      try {
        const newBadges = await checkAndAwardBadges(user.id, {
          event: "module_complete",
          moduleScore: score,
          timeSpentSeconds: timeSpent,
        });
        if (newBadges.length > 0) {
          return { success: true, newBadges, pointsEarned: pointsEarned > 0 ? pointsEarned : undefined };
        }
      } catch {
        // Badge check failure should not block progress update
      }

      return { success: true, pointsEarned: pointsEarned > 0 ? pointsEarned : undefined };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Reset learning progress for a module (used when content is regenerated).
 * Deletes the progress record so the module returns to "not started" state.
 */
export async function resetModuleProgress(
  moduleId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify module exists and user owns the learning path
    const { data: moduleData, error: moduleError } = await supabase
      .from("learning_modules")
      .select("id, learning_path_id")
      .eq("id", moduleId)
      .single();

    if (moduleError || !moduleData) {
      return { success: false, error: "Module not found" };
    }

    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", moduleData.learning_path_id)
      .eq("user_id", user.id)
      .single();

    if (pathError || !path) {
      return { success: false, error: "Learning path not found" };
    }

    // Delete progress record
    await supabase
      .from("learning_progress")
      .delete()
      .eq("module_id", moduleId)
      .eq("user_id", user.id);

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

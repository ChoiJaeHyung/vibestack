"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  calculateHealthScore,
  type HealthScoreResult,
} from "@/lib/analysis/health-scorer";
import type { EducationalAnalysis } from "@/types/educational-analysis";
import type { Json } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface StoredHealthScore {
  id: string;
  overallScore: number;
  categories: HealthScoreResult["categories"];
  improvementItems: HealthScoreResult["improvementItems"];
  version: number;
  updatedAt: string;
}

// ── Actions ────────────────────────────────────────────────────

/**
 * Get health score for a project (returns cached if available).
 */
export async function getHealthScore(
  projectId: string,
): Promise<ActionResult<StoredHealthScore>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Try cached score
    const serviceClient = createServiceClient();
    const { data: cached } = await serviceClient
      .from("code_health_scores")
      .select("id, overall_score, scores, improvement_items, version, updated_at")
      .eq("project_id", projectId)
      .single();

    if (cached) {
      const scores = cached.scores as unknown as HealthScoreResult["categories"];
      const items = cached.improvement_items as unknown as HealthScoreResult["improvementItems"];

      return {
        success: true,
        data: {
          id: cached.id,
          overallScore: cached.overall_score,
          categories: scores,
          improvementItems: items,
          version: cached.version,
          updatedAt: cached.updated_at,
        },
      };
    }

    // No cached score — calculate
    return recalculateHealthScore(projectId, user.id);
  } catch {
    return { success: false, error: "Failed to get health score" };
  }
}

/**
 * Force recalculate health score for a project.
 */
export async function recalculateHealthScore(
  projectId: string,
  userId?: string,
): Promise<ActionResult<StoredHealthScore>> {
  try {
    let resolvedUserId = userId;

    if (!resolvedUserId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Not authenticated" };
      }
      resolvedUserId = user.id;
    }

    const serviceClient = createServiceClient();

    // Verify project ownership
    const { data: project } = await serviceClient
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", resolvedUserId)
      .single();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Get educational analysis
    const { data: eduAnalysis } = await serviceClient
      .from("educational_analyses")
      .select("analysis_data, analysis_version")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!eduAnalysis) {
      return {
        success: false,
        error: "Educational analysis not found. Please analyze the project first.",
      };
    }

    const analysis = eduAnalysis.analysis_data as unknown as EducationalAnalysis;
    const result = calculateHealthScore(analysis);

    // Upsert score
    const now = new Date().toISOString();
    const { data: upserted, error: upsertError } = await serviceClient
      .from("code_health_scores")
      .upsert(
        {
          project_id: projectId,
          overall_score: result.overallScore,
          scores: result.categories as unknown as Json,
          improvement_items: result.improvementItems as unknown as Json,
          version: eduAnalysis.analysis_version ?? 1,
          updated_at: now,
        },
        { onConflict: "project_id" },
      )
      .select("id, overall_score, scores, improvement_items, version, updated_at")
      .single();

    if (upsertError || !upserted) {
      return { success: false, error: "Failed to save health score" };
    }

    return {
      success: true,
      data: {
        id: upserted.id,
        overallScore: upserted.overall_score,
        categories: upserted.scores as unknown as HealthScoreResult["categories"],
        improvementItems: upserted.improvement_items as unknown as HealthScoreResult["improvementItems"],
        version: upserted.version,
        updatedAt: upserted.updated_at,
      },
    };
  } catch {
    return { success: false, error: "Failed to calculate health score" };
  }
}

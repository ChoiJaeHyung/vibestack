import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";

export interface GrowthData {
  conceptsMastered: number;
  totalConcepts: number;
  avgQuizScore: number;
  totalQuizAttempts: number;
  modulesCompletedThisMonth: number;
  totalModulesCompleted: number;
}

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
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString();

    const [masteryResult, progressResult, monthlyProgressResult] =
      await Promise.all([
        supabase
          .from("user_concept_mastery")
          .select("mastery_level")
          .eq("user_id", authUser.id),
        supabase
          .from("learning_progress")
          .select("status, score")
          .eq("user_id", authUser.id),
        supabase
          .from("learning_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.id)
          .eq("status", "completed")
          .gte("updated_at", startOfMonth),
      ]);

    const masteryData = masteryResult.data ?? [];
    const conceptsMastered = masteryData.filter(
      (m) => m.mastery_level >= 80,
    ).length;

    const progressData = progressResult.data ?? [];
    const quizScores = progressData
      .filter((p) => p.score !== null && p.score > 0)
      .map((p) => p.score as number);
    const avgQuizScore =
      quizScores.length > 0
        ? Math.round(
            quizScores.reduce((sum, s) => sum + s, 0) / quizScores.length,
          )
        : 0;

    const totalCompleted = progressData.filter(
      (p) => p.status === "completed",
    ).length;

    const growthData: GrowthData = {
      conceptsMastered,
      totalConcepts: masteryData.length,
      avgQuizScore,
      totalQuizAttempts: quizScores.length,
      modulesCompletedThisMonth: monthlyProgressResult.count ?? 0,
      totalModulesCompleted: totalCompleted,
    };

    return NextResponse.json({ success: true, data: growthData });
  } catch {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

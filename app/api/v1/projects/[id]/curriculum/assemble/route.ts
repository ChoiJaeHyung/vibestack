import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  assembleCurriculum,
  persistAssembledCurriculum,
  checkMultiTechCoverage,
} from "@/server/actions/template-assembler";
import { getKBHints } from "@/lib/knowledge";
import type { Locale } from "@/types/database";

/**
 * POST /api/v1/projects/:id/curriculum/assemble
 *
 * Attempts to assemble a curriculum from pre-built templates.
 * Returns { mode: "prebuilt", learning_path_id, module_count, message }
 * if templates are available, or { mode: "instruction" } if not.
 *
 * Used by MCP generate_curriculum tool to skip local AI generation
 * when pre-built templates cover the project's tech stack.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request);
  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { id: projectId } = await params;
  const userId = authResult.userId;

  try {
    const body = await request.json();
    const difficulty = body.difficulty ?? "beginner";

    if (!["beginner", "intermediate", "advanced"].includes(difficulty)) {
      return errorResponse("Invalid difficulty. Must be beginner, intermediate, or advanced.", 400);
    }

    const supabase = createServiceClient();

    // Fetch tech stacks for this project
    const { data: techStacks, error: techError } = await supabase
      .from("tech_stacks")
      .select("id, technology_name, category, importance, version")
      .eq("project_id", projectId);

    if (techError || !techStacks || techStacks.length === 0) {
      return successResponse({ mode: "instruction" });
    }

    // Fetch user locale
    const { data: userData } = await supabase
      .from("users")
      .select("locale")
      .eq("id", userId)
      .single();
    const locale: Locale = (userData?.locale as Locale) ?? "ko";

    // Check template coverage (need KB concept keys per tech)
    const techConcepts = await Promise.all(
      techStacks.map(async (t) => {
        const hints = await getKBHints(t.technology_name, locale);
        return {
          techName: t.technology_name,
          conceptKeys: hints.map((h) => h.concept_key),
        };
      }),
    );
    const coverage = await checkMultiTechCoverage(techConcepts, locale);

    // Need at least some coverage to attempt assembly
    const hasCoverage = coverage.perTech.some((c) => c.level !== "none");
    if (!hasCoverage) {
      return successResponse({ mode: "instruction" });
    }

    // Attempt assembly
    const assembled = await assembleCurriculum({
      projectId,
      userId,
      techStacks: techStacks.map((t) => ({
        technology_name: t.technology_name,
        category: t.category ?? "other",
        importance: t.importance ?? "medium",
        version: t.version,
      })),
      difficulty: difficulty as "beginner" | "intermediate" | "advanced",
      locale,
    });

    // Need at least 5 modules for a valid curriculum
    if (assembled.modules.length < 5) {
      return successResponse({ mode: "instruction" });
    }

    // Persist to DB
    const persistResult = await persistAssembledCurriculum(
      assembled,
      userId,
      projectId,
      techStacks.map((t) => ({ id: t.id, technology_name: t.technology_name })),
    );
    const learningPathId = persistResult.learningPathId;

    return successResponse({
      mode: "prebuilt",
      learning_path_id: learningPathId,
      module_count: assembled.modules.length,
      message: locale === "en"
        ? `Curriculum assembled instantly (${assembled.modules.length} modules, prebuilt)`
        : `커리큘럼이 즉시 생성되었습니다 (${assembled.modules.length}모듈, 프리빌트)`,
    });
  } catch (err) {
    console.error("[assemble-api] Error:", err instanceof Error ? err.message : err);
    // On any error, fall back to instruction mode
    return successResponse({ mode: "instruction" });
  }
}

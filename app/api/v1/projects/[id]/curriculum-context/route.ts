import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getKBHints } from "@/lib/knowledge";
import type { ConceptHint } from "@/lib/knowledge/types";

interface TechStackItem {
  name: string;
  category: string;
  version: string | null;
  confidence: number;
  importance: string;
}

interface CurriculumContextResponse {
  techStacks: TechStackItem[];
  knowledgeHints: Record<string, ConceptHint[]>;
  educationalAnalysis: unknown | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { id: projectId } = await params;

  try {
    const supabase = createServiceClient();

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    // Fetch tech stacks, educational analysis in parallel
    const [techStacksResult, eduAnalysisResult] = await Promise.all([
      supabase
        .from("tech_stacks")
        .select(
          "technology_name, category, version, confidence_score, importance",
        )
        .eq("project_id", projectId)
        .order("confidence_score", { ascending: false }),
      supabase
        .from("educational_analyses")
        .select("analysis_data")
        .eq("project_id", projectId)
        .eq("user_id", authResult.userId)
        .maybeSingle(),
    ]);

    const techStacks: TechStackItem[] = (techStacksResult.data ?? []).map(
      (t) => ({
        name: t.technology_name,
        category: t.category,
        version: t.version,
        confidence: t.confidence_score,
        importance: t.importance,
      }),
    );

    // Fetch KB hints for all detected tech names
    const techNames = techStacks.map((t) => t.name);
    const kbEntries = await Promise.all(
      techNames.map(async (name) => {
        const hints = await getKBHints(name);
        return [name, hints] as const;
      }),
    );

    const knowledgeHints: Record<string, ConceptHint[]> = {};
    for (const [name, hints] of kbEntries) {
      if (hints.length > 0) {
        knowledgeHints[name] = hints;
      }
    }

    const response: CurriculumContextResponse = {
      techStacks,
      knowledgeHints,
      educationalAnalysis: eduAnalysisResult.data?.analysis_data ?? null,
    };

    return successResponse(response);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

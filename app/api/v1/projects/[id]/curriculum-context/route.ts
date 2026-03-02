import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptContent } from "@/lib/utils/content-encryption";
import { getKBHints } from "@/lib/knowledge";
import type { ConceptHint } from "@/lib/knowledge/types";

const MAX_CURRICULUM_FILES = 20;
const MAX_CURRICULUM_CONTENT_LENGTH = 8000;

interface TechStackItem {
  name: string;
  category: string;
  version: string | null;
  confidence: number;
  importance: string;
}

interface FileItem {
  file_path: string;
  content: string;
}

interface CurriculumContextResponse {
  techStacks: TechStackItem[];
  knowledgeHints: Record<string, ConceptHint[]>;
  educationalAnalysis: unknown | null;
  files: FileItem[];
  locale: "ko" | "en";
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

    // Fetch user locale
    const { data: userData } = await supabase
      .from("users")
      .select("locale")
      .eq("id", authResult.userId)
      .single();
    const locale = (userData?.locale === "en" ? "en" : "ko") as "ko" | "en";

    // Fetch tech stacks, educational analysis, and project files in parallel
    const [techStacksResult, eduAnalysisResult, filesResult] = await Promise.all([
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
      supabase
        .from("project_files")
        .select("file_name, file_path, raw_content")
        .eq("project_id", projectId)
        .not("raw_content", "is", null)
        .neq("file_name", "_project_digest.md"),
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
        const hints = await getKBHints(name, locale);
        return [name, hints] as const;
      }),
    );

    const knowledgeHints: Record<string, ConceptHint[]> = {};
    for (const [name, hints] of kbEntries) {
      if (hints.length > 0) {
        knowledgeHints[name] = hints;
      }
    }

    // Decrypt and truncate project files for curriculum context
    const files: FileItem[] = [];
    const rawFiles = filesResult.data ?? [];
    const filesToProcess = rawFiles.slice(0, MAX_CURRICULUM_FILES);

    for (const f of filesToProcess) {
      if (!f.raw_content) continue;

      let content = decryptContent(f.raw_content);
      if (content.length > MAX_CURRICULUM_CONTENT_LENGTH) {
        content =
          content.slice(0, MAX_CURRICULUM_CONTENT_LENGTH) +
          `\n// ... truncated (original ${content.length} chars)`;
      }

      files.push({
        file_path: f.file_path ?? f.file_name,
        content,
      });
    }

    const response: CurriculumContextResponse = {
      techStacks,
      knowledgeHints,
      educationalAnalysis: eduAnalysisResult.data?.analysis_data ?? null,
      files,
      locale,
    };

    return successResponse(response);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

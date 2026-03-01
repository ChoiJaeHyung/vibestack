import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptContent } from "@/lib/utils/content-encryption";

const MAX_FILES = 10;
const MAX_CONTENT_LENGTH = 6000;

interface TutorContextResponse {
  techStacks: Array<{
    technology_name: string;
    category: string;
    description: string | null;
  }>;
  files: Array<{
    file_name: string;
    content: string;
  }>;
  learningContext?: {
    path_title: string;
    learning_path_id: string;
    current_module: string;
    modules: Array<{
      id: string;
      title: string;
      module_order: number;
    }>;
  };
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

    // Load project files (replicating tutor-chat.ts lines 44-50)
    const { data: projectFiles } = await supabase
      .from("project_files")
      .select("file_name, raw_content")
      .eq("project_id", projectId)
      .not("raw_content", "is", null)
      .limit(MAX_FILES);

    // Load tech stacks (replicating tutor-chat.ts lines 52-55)
    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select("technology_name, category, description")
      .eq("project_id", projectId);

    // Build learning context (replicating tutor-chat.ts lines 57-83)
    let learningContext:
      | { path_title: string; learning_path_id: string; current_module: string; modules: Array<{ id: string; title: string; module_order: number }> }
      | undefined;

    // Find the most recent active learning path for this project
    const { data: learningPath } = await supabase
      .from("learning_paths")
      .select("id, title")
      .eq("project_id", projectId)
      .eq("user_id", authResult.userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (learningPath) {
      const { data: modules } = await supabase
        .from("learning_modules")
        .select("id, title, module_order")
        .eq("learning_path_id", learningPath.id)
        .order("module_order", { ascending: true });

      learningContext = {
        path_title: learningPath.title,
        learning_path_id: learningPath.id,
        current_module: modules?.[0]?.title ?? "Getting started",
        modules: (modules ?? []).map((m) => ({
          id: m.id,
          title: m.title,
          module_order: m.module_order,
        })),
      };
    }

    // Process files: decrypt and truncate
    const files = (projectFiles ?? [])
      .filter(
        (f): f is { file_name: string; raw_content: string } =>
          f.raw_content !== null,
      )
      .map((f) => {
        let content = decryptContent(f.raw_content);
        if (content.length > MAX_CONTENT_LENGTH) {
          content =
            content.slice(0, MAX_CONTENT_LENGTH) + "\n... [truncated]";
        }
        return {
          file_name: f.file_name,
          content,
        };
      });

    const response: TutorContextResponse = {
      techStacks: (techStacks ?? []).map((t) => ({
        technology_name: t.technology_name,
        category: t.category,
        description: t.description,
      })),
      files,
      ...(learningContext ? { learningContext } : {}),
    };

    return successResponse(response);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

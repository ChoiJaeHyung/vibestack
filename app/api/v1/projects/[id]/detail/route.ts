import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptContent } from "@/lib/utils/content-encryption";

const MAX_FILES = 30;
const MAX_CONTENT_LENGTH = 10000;

interface FileItem {
  file_name: string;
  file_path: string;
  content: string;
}

interface FileListItem {
  file_name: string;
  file_path: string;
}

interface TechStackItem {
  name: string;
  category: string;
  version: string | null;
  confidence: number;
  importance: string;
  description: string | null;
}

interface DetailResponse {
  id: string;
  name: string;
  status: string;
  files: FileItem[];
  allFileList?: FileListItem[];
  existingTechStacks: TechStackItem[];
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
      .select("id, name, status, user_id")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    // Fetch files with content
    const { data: allFiles, error: filesError } = await supabase
      .from("project_files")
      .select("file_name, file_path, raw_content")
      .eq("project_id", projectId)
      .not("raw_content", "is", null);

    if (filesError) {
      return errorResponse("Failed to fetch project files", 500);
    }

    const files: FileItem[] = [];
    let allFileList: FileListItem[] | undefined;

    const filesList = allFiles ?? [];

    // If more than MAX_FILES, return first MAX_FILES with content, rest as list
    const filesToProcess = filesList.slice(0, MAX_FILES);
    if (filesList.length > MAX_FILES) {
      allFileList = filesList.map((f) => ({
        file_name: f.file_name,
        file_path: f.file_path ?? "",
      }));
    }

    for (const f of filesToProcess) {
      if (!f.raw_content) continue;

      let content = decryptContent(f.raw_content);
      if (content.length > MAX_CONTENT_LENGTH) {
        content =
          content.slice(0, MAX_CONTENT_LENGTH) +
          `\n// ... truncated (original ${content.length} chars)`;
      }

      files.push({
        file_name: f.file_name,
        file_path: f.file_path ?? "",
        content,
      });
    }

    // Fetch existing tech stacks
    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select(
        "technology_name, category, version, confidence_score, importance, description",
      )
      .eq("project_id", projectId)
      .order("confidence_score", { ascending: false });

    const existingTechStacks: TechStackItem[] = (techStacks ?? []).map((t) => ({
      name: t.technology_name,
      category: t.category,
      version: t.version,
      confidence: t.confidence_score,
      importance: t.importance,
      description: t.description,
    }));

    const response: DetailResponse = {
      id: project.id,
      name: project.name,
      status: project.status,
      files,
      ...(allFileList ? { allFileList } : {}),
      existingTechStacks,
    };

    return successResponse(response);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

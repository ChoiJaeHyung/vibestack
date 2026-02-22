import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { ProjectDetailResponse } from "@/types/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, description, status, source_platform, source_channel, tech_summary, last_synced_at, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    const { data: files } = await supabase
      .from("project_files")
      .select("id, file_name, file_type, file_path, file_size, content_hash, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    const { data: techStacks } = await supabase
      .from("tech_stacks")
      .select("id, technology_name, category, subcategory, version, confidence_score, importance, description")
      .eq("project_id", id)
      .order("confidence_score", { ascending: false });

    return successResponse<ProjectDetailResponse>({
      ...project,
      files: files ?? [],
      tech_stacks: techStacks ?? [],
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

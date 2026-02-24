import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

type EducationalAnalysisInsert =
  Database["public"]["Tables"]["educational_analyses"]["Insert"];

export async function POST(
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

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    const body = await request.json();

    if (!body.analysis_data || typeof body.analysis_data !== "object") {
      return errorResponse("analysis_data object is required", 400);
    }

    const upsertData: EducationalAnalysisInsert = {
      project_id: projectId,
      user_id: authResult.userId,
      analysis_data: body.analysis_data,
      analysis_version: 1,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("educational_analyses")
      .upsert(upsertData, { onConflict: "project_id" });

    if (error) {
      return errorResponse("Failed to save educational analysis", 500);
    }

    return successResponse(
      { project_id: projectId, message: "Educational analysis saved" },
      201,
    );
  } catch {
    return errorResponse("Invalid request body", 400);
  }
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

    const { data, error } = await supabase
      .from("educational_analyses")
      .select("analysis_data")
      .eq("project_id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (error || !data) {
      return errorResponse("No educational analysis found", 404);
    }

    return successResponse(data.analysis_data);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

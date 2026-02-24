import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

interface AnalysisJobResponse {
  job_id: string;
  status: string;
  error_message: string | null;
  tech_stacks: TechStackResult[];
  started_at: string | null;
  completed_at: string | null;
}

interface TechStackResult {
  technology_name: string;
  category: string;
  version: string | null;
  confidence_score: number;
  importance: string;
  description: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { id: projectId, jobId } = await params;

  try {
    const supabase = createServiceClient();

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    // Fetch analysis job
    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .select("id, status, error_message, started_at, completed_at")
      .eq("id", jobId)
      .eq("project_id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (jobError || !job) {
      return errorResponse("Analysis job not found", 404);
    }

    // If completed, include tech stacks
    let techStacks: TechStackResult[] = [];

    if (job.status === "completed") {
      const { data: stacks } = await supabase
        .from("tech_stacks")
        .select(
          "technology_name, category, version, confidence_score, importance, description",
        )
        .eq("project_id", projectId);

      techStacks = stacks ?? [];
    }

    return successResponse<AnalysisJobResponse>({
      job_id: job.id,
      status: job.status,
      error_message: job.error_message ?? null,
      tech_stacks: techStacks,
      started_at: job.started_at ?? null,
      completed_at: job.completed_at ?? null,
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

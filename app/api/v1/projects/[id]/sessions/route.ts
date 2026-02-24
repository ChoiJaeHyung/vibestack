import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

interface SessionRequestBody {
  summary: string;
  files_changed?: string[];
}

interface SessionResponse {
  session_id: string;
}

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
    const body = (await request.json()) as SessionRequestBody;

    if (!body.summary || body.summary.trim().length === 0) {
      return errorResponse("summary is required", 400);
    }

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

    // Insert session log
    const { data: session, error: sessionError } = await supabase
      .from("mcp_sessions")
      .insert({
        user_id: authResult.userId,
        project_id: projectId,
        client_tool: "mcp-server",
        tools_called: {
          summary: body.summary,
          files_changed: body.files_changed ?? [],
        },
        files_synced: body.files_changed?.length ?? 0,
        is_active: false,
        session_end: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      return errorResponse("Failed to create session log", 500);
    }

    return successResponse<SessionResponse>({
      session_id: session.id,
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

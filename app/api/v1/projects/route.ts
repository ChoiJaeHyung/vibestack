import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { checkUsageLimit } from "@/lib/utils/usage-limits";
import type { Database } from "@/types/database";
import type { ProjectCreateRequest, ProjectResponse } from "@/types/api";

type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export async function POST(request: NextRequest) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const body = (await request.json()) as Partial<ProjectCreateRequest>;

    if (!body.name || typeof body.name !== "string") {
      return errorResponse("name is required", 400);
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("projects")
      .select("id, name, description, status, source_platform, source_channel, tech_summary, last_synced_at, created_at, updated_at")
      .eq("user_id", authResult.userId)
      .eq("name", body.name)
      .maybeSingle();

    if (existing) {
      const projectUpdate: ProjectUpdate = {
        description: body.description ?? existing.description,
        source_platform: body.source_platform ?? existing.source_platform,
        source_channel: body.source_channel ?? existing.source_channel ?? "api",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: updated, error: updateError } = await supabase
        .from("projects")
        .update(projectUpdate)
        .eq("id", existing.id)
        .select("id, name, description, status, source_platform, source_channel, tech_summary, last_synced_at, created_at, updated_at")
        .single();

      if (updateError || !updated) {
        return errorResponse("Failed to update project", 500);
      }

      return successResponse<ProjectResponse>(updated);
    }

    const limitCheck = await checkUsageLimit(authResult.userId, "analysis");
    if (!limitCheck.allowed) {
      return errorResponse(limitCheck.upgrade_message ?? "Usage limit exceeded", 403);
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: authResult.userId,
        name: body.name,
        description: body.description,
        source_platform: body.source_platform,
        source_channel: body.source_channel ?? "api",
        last_synced_at: new Date().toISOString(),
      })
      .select("id, name, description, status, source_platform, source_channel, tech_summary, last_synced_at, created_at, updated_at")
      .single();

    if (error || !data) {
      return errorResponse("Failed to create project", 500);
    }

    return successResponse<ProjectResponse>(data, 201);
  } catch {
    return errorResponse("Invalid request body", 400);
  }
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, status, source_platform, source_channel, tech_summary, last_synced_at, created_at, updated_at")
      .eq("user_id", authResult.userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return errorResponse("Failed to list projects", 500);
    }

    return successResponse(data ?? []);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

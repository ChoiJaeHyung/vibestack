import { NextRequest } from "next/server";
import { after } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { upsertTechStacks } from "@/lib/analysis/tech-stack-utils";
import { generateMissingKBs } from "@/server/actions/knowledge";
import type { Database } from "@/types/database";

type Importance = Database["public"]["Enums"]["importance"];

const VALID_IMPORTANCE = new Set<Importance>([
  "core",
  "supporting",
  "dev_dependency",
]);

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
    const body = await request.json();

    // Validate input
    if (
      !body.technologies ||
      !Array.isArray(body.technologies) ||
      body.technologies.length === 0
    ) {
      return errorResponse(
        "technologies array is required and must have at least 1 entry",
        400,
      );
    }

    // Validate each technology
    for (let i = 0; i < body.technologies.length; i++) {
      const tech = body.technologies[i];
      if (!tech.name || typeof tech.name !== "string") {
        return errorResponse(
          `technologies[${i}].name is required and must be a string`,
          400,
        );
      }
      if (!tech.category || typeof tech.category !== "string") {
        return errorResponse(
          `technologies[${i}].category is required and must be a string`,
          400,
        );
      }
      if (
        typeof tech.confidence !== "number" ||
        tech.confidence < 0 ||
        tech.confidence > 1
      ) {
        return errorResponse(
          `technologies[${i}].confidence must be a number between 0 and 1`,
          400,
        );
      }
      if (
        !tech.importance ||
        !VALID_IMPORTANCE.has(tech.importance as Importance)
      ) {
        return errorResponse(
          `technologies[${i}].importance must be one of: core, supporting, dev_dependency`,
          400,
        );
      }
    }

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

    // Upsert tech stacks
    const { savedCount } = await upsertTechStacks(
      supabase,
      projectId,
      body.technologies,
      body.architecture_summary,
    );

    // Generate KB entries in background (non-blocking)
    after(async () => {
      try {
        // KB generation needs an LLM provider — use a lightweight approach
        // Import dynamically to avoid circular deps
        const { getDefaultLlmKeyWithDiagnosis } = await import(
          "@/server/actions/llm-keys"
        );
        const { createLLMProvider } = await import("@/lib/llm/factory");

        const llmKeyResult = await getDefaultLlmKeyWithDiagnosis(
          authResult.userId,
        );
        if (llmKeyResult.data) {
          const provider = createLLMProvider(
            llmKeyResult.data.provider,
            llmKeyResult.data.apiKey,
          );
          await generateMissingKBs(
            body.technologies.map(
              (t: { name: string; version?: string }) => ({
                name: t.name,
                version: t.version ?? null,
              }),
            ),
            provider,
          );
        }
      } catch (kbErr) {
        console.error("[tech-stacks] KB generation failed:", kbErr);
      }
    });

    return successResponse({
      savedCount,
      projectStatus: "analyzed",
    });
  } catch {
    return errorResponse("Invalid request body", 400);
  }
}

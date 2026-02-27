import { NextRequest } from "next/server";
import { after } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { extractTechHints } from "@/lib/analysis/file-parser";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { llmKeyErrorMessage } from "@/lib/utils/llm-key-errors";
import { createLLMProvider } from "@/lib/llm/factory";
import { buildDigestAnalysisPrompt } from "@/lib/prompts/tech-analysis";
import { decryptContent } from "@/lib/utils/content-encryption";
import { generateMissingKBs } from "@/server/actions/knowledge";
import type { Database } from "@/types/database";
import type { AnalyzeResponse } from "@/types/api";
import type { TechHint, TechnologyResult } from "@/lib/llm/types";

// Analysis + KB generation can take 2-3 minutes for large projects
export const maxDuration = 300;

type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
type AnalysisJobInsert = Database["public"]["Tables"]["analysis_jobs"]["Insert"];
type AnalysisJobUpdate = Database["public"]["Tables"]["analysis_jobs"]["Update"];
type TechStackInsert = Database["public"]["Tables"]["tech_stacks"]["Insert"];
type TechCategory = Database["public"]["Enums"]["tech_category"];
type Importance = Database["public"]["Enums"]["importance"];

const VALID_CATEGORIES = new Set<TechCategory>([
  "framework",
  "language",
  "database",
  "auth",
  "deploy",
  "styling",
  "testing",
  "build_tool",
  "library",
  "other",
]);

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
    const supabase = createServiceClient();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, status")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    const { count } = await supabase
      .from("project_files")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (!count || count === 0) {
      return errorResponse("No files uploaded for this project. Upload files first.", 400);
    }

    const projectUpdate: ProjectUpdate = {
      status: "analyzing",
      updated_at: new Date().toISOString(),
    };
    await supabase
      .from("projects")
      .update(projectUpdate)
      .eq("id", projectId);

    const jobInsert: AnalysisJobInsert = {
      project_id: projectId,
      user_id: authResult.userId,
      job_type: "tech_analysis",
      status: "pending",
    };
    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .insert(jobInsert)
      .select("id, status")
      .single();

    if (jobError || !job) {
      return errorResponse("Failed to create analysis job", 500);
    }

    // Run analysis in background using after() to ensure it completes on Vercel
    after(async () => {
      await runAnalysis(supabase, projectId, authResult.userId, job.id);
    });

    return successResponse<AnalyzeResponse>({
      job_id: job.id,
      status: "pending",
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

async function runAnalysis(
  supabase: ReturnType<typeof createServiceClient>,
  projectId: string,
  userId: string,
  jobId: string,
): Promise<void> {
  try {
    // Step 1: Set job status to 'processing'
    const processingUpdate: AnalysisJobUpdate = {
      status: "processing",
      started_at: new Date().toISOString(),
    };
    await supabase
      .from("analysis_jobs")
      .update(processingUpdate)
      .eq("id", jobId);

    // Step 2: Load project files
    const { data: files, error: filesError } = await supabase
      .from("project_files")
      .select("file_name, file_type, raw_content")
      .eq("project_id", projectId);

    if (filesError || !files || files.length === 0) {
      throw new Error("Failed to load project files");
    }

    // Decrypt raw_content for all files
    const decryptedFiles = files.map((f) => ({
      ...f,
      raw_content: f.raw_content ? decryptContent(f.raw_content) : f.raw_content,
    }));

    // Step 3: Extract tech hints from files
    const techHints = extractTechHints(decryptedFiles);

    // Step 4: Load user's default LLM key
    const llmKeyResult = await getDefaultLlmKeyWithDiagnosis(userId);
    if (!llmKeyResult.data) {
      throw new Error(llmKeyErrorMessage(llmKeyResult.error));
    }
    const llmKeyData = llmKeyResult.data;

    // Step 5: Create LLM provider via factory
    const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);

    // Update job with provider info
    await supabase
      .from("analysis_jobs")
      .update({
        llm_provider: provider.providerName,
        llm_model: provider.modelName,
      })
      .eq("id", jobId);

    // Step 6: Call provider.analyze()
    // Use digest-based prompt if _project_digest.md exists (more efficient)
    const digestFile = decryptedFiles.find(
      (f) => f.file_name === "_project_digest.md",
    );

    const mappedHints = techHints.map(
      (h): TechHint => ({
        name: h.name,
        version: h.version,
        source: h.detectedFrom,
        confidence: h.confidence,
      }),
    );

    const nonDigestFiles = decryptedFiles.filter(
      (f) => f.file_name !== "_project_digest.md" && f.raw_content,
    );

    const analysisInput = {
      files: nonDigestFiles.map((f) => ({
        name: f.file_name,
        content: f.raw_content as string,
        type: f.file_type,
      })),
      techHints: mappedHints,
      ...(digestFile?.raw_content
        ? {
            promptOverride: buildDigestAnalysisPrompt(
              digestFile.raw_content,
              mappedHints,
            ),
          }
        : {}),
    };

    const analysisOutput = await provider.analyze(analysisInput);

    // Step 7: Save results to tech_stacks (upsert by project_id + technology_name)
    for (const tech of analysisOutput.technologies) {
      const category = VALID_CATEGORIES.has(tech.category as TechCategory)
        ? (tech.category as TechCategory)
        : "other";

      const importance = VALID_IMPORTANCE.has(tech.importance as Importance)
        ? (tech.importance as Importance)
        : "supporting";

      const techStackData: TechStackInsert = {
        project_id: projectId,
        technology_name: tech.name,
        category,
        version: tech.version ?? null,
        confidence_score: tech.confidence,
        detected_from: getDetectedFromSources(tech, techHints),
        description: tech.description,
        importance,
        relationships: tech.relationships
          ? (tech.relationships as unknown as Database["public"]["Tables"]["tech_stacks"]["Insert"]["relationships"])
          : null,
      };

      // Try to upsert: check if exists, then update or insert
      const { data: existingTech } = await supabase
        .from("tech_stacks")
        .select("id")
        .eq("project_id", projectId)
        .eq("technology_name", tech.name)
        .single();

      if (existingTech) {
        await supabase
          .from("tech_stacks")
          .update({
            category,
            version: tech.version ?? null,
            confidence_score: tech.confidence,
            detected_from: getDetectedFromSources(tech, techHints),
            description: tech.description,
            importance,
            relationships: tech.relationships
              ? (tech.relationships as unknown as Database["public"]["Tables"]["tech_stacks"]["Update"]["relationships"])
              : null,
          })
          .eq("id", existingTech.id);
      } else {
        await supabase.from("tech_stacks").insert(techStackData);
      }
    }

    // Step 8: Update projects.tech_summary
    const techSummary = {
      architecture_summary: analysisOutput.architecture_summary,
      total_technologies: analysisOutput.technologies.length,
      core_technologies: analysisOutput.technologies
        .filter((t) => t.importance === "core")
        .map((t) => t.name),
      categories: groupTechnologiesByCategory(analysisOutput.technologies),
      analyzed_at: new Date().toISOString(),
      llm_provider: provider.providerName,
      llm_model: provider.modelName,
    };

    // Step 9: Update project status to 'analyzed'
    const analyzedUpdate: ProjectUpdate = {
      status: "analyzed",
      tech_summary: techSummary,
      updated_at: new Date().toISOString(),
    };
    await supabase
      .from("projects")
      .update(analyzedUpdate)
      .eq("id", projectId);

    // Step 10: Update job to 'completed' with token counts
    const completedUpdate: AnalysisJobUpdate = {
      status: "completed",
      input_tokens: analysisOutput.input_tokens,
      output_tokens: analysisOutput.output_tokens,
      completed_at: new Date().toISOString(),
    };
    await supabase
      .from("analysis_jobs")
      .update(completedUpdate)
      .eq("id", jobId);

    // Step 11: Generate KB entries for detected technologies
    try {
      await generateMissingKBs(
        analysisOutput.technologies.map(t => ({ name: t.name, version: t.version ?? null })),
        provider,
      );
    } catch (kbErr) {
      console.error("[analyze] KB generation failed:", kbErr);
      // Non-fatal — don't fail the analysis job for KB errors
    }
  } catch (error) {
    // Step 12: On error, set job to 'failed' with error_message
    const errorMessage =
      error instanceof Error ? error.message : "Analysis failed unexpectedly";

    const failedJobUpdate: AnalysisJobUpdate = {
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    };
    await supabase
      .from("analysis_jobs")
      .update(failedJobUpdate)
      .eq("id", jobId);

    const failedProjectUpdate: ProjectUpdate = {
      status: "error",
      updated_at: new Date().toISOString(),
    };
    await supabase
      .from("projects")
      .update(failedProjectUpdate)
      .eq("id", projectId);
  }
}

function getDetectedFromSources(
  tech: TechnologyResult,
  hints: ReturnType<typeof extractTechHints>,
): string[] {
  const sources: string[] = ["llm_analysis"];
  const matchingHint = hints.find(
    (h) => h.name.toLowerCase() === tech.name.toLowerCase(),
  );
  if (matchingHint) {
    sources.push(matchingHint.detectedFrom);
  }
  return sources;
}

function groupTechnologiesByCategory(
  technologies: TechnologyResult[],
): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const tech of technologies) {
    if (!groups[tech.category]) {
      groups[tech.category] = [];
    }
    groups[tech.category].push(tech.name);
  }
  return groups;
}

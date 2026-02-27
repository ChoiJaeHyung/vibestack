"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { extractTechHints } from "@/lib/analysis/file-parser";
import { generateDigest, digestToMarkdown } from "@/lib/analysis/digest-generator";
import { getDefaultLlmKeyWithDiagnosis } from "@/server/actions/llm-keys";
import { llmKeyErrorMessage } from "@/lib/utils/llm-key-errors";
import { createLLMProvider } from "@/lib/llm/factory";
import { buildDigestAnalysisPrompt } from "@/lib/prompts/tech-analysis";
import { decryptContent } from "@/lib/utils/content-encryption";
import { generateMissingKBs } from "@/server/actions/knowledge";
import type { Database } from "@/types/database";
import type { TechHint, TechnologyResult } from "@/lib/llm/types";

interface ProjectFile {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
}

interface TechStackItem {
  id: string;
  technology_name: string;
  category: string;
  subcategory: string | null;
  version: string | null;
  confidence_score: number;
  importance: string;
  description: string | null;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  source_platform: string | null;
  source_channel: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetailData {
  project: ProjectData;
  files: ProjectFile[];
  techStacks: TechStackItem[];
}

interface DeleteProjectResult {
  success: boolean;
  error?: string;
}

interface StartAnalysisResult {
  success: boolean;
  job_id?: string;
  error?: string;
}

interface GetProjectDetailResult {
  success: boolean;
  data?: ProjectDetailData;
  error?: string;
}

interface GetProjectStatusResult {
  success: boolean;
  status?: string;
  error?: string;
}

export async function deleteProject(
  projectId: string,
): Promise<DeleteProjectResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (deleteError) {
      return { success: false, error: "Failed to delete project" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function startAnalysis(
  projectId: string,
): Promise<StartAnalysisResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    if (project.status === "analyzing") {
      return { success: false, error: "Analysis already in progress" };
    }

    // Update project status to analyzing
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        status: "analyzing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: "Failed to start analysis" };
    }

    // Create analysis job record
    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .insert({
        project_id: projectId,
        user_id: user.id,
        job_type: "tech_analysis" as const,
        status: "pending" as const,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return { success: false, error: "Failed to create analysis job" };
    }

    // Fire-and-forget the actual analysis pipeline
    runAnalysisPipeline(projectId, user.id, job.id).catch(() => {
      // Error handling is done inside runAnalysisPipeline
    });

    return { success: true, job_id: job.id };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getProjectDetail(
  projectId: string,
): Promise<GetProjectDetailResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select(
        "id, name, description, status, source_platform, source_channel, last_synced_at, created_at, updated_at",
      )
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !projectData) {
      return { success: false, error: "Project not found" };
    }

    const { data: fileData } = await supabase
      .from("project_files")
      .select("id, file_name, file_type, file_path, file_size, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    const { data: techData } = await supabase
      .from("tech_stacks")
      .select(
        "id, technology_name, category, subcategory, version, confidence_score, importance, description",
      )
      .eq("project_id", projectId)
      .order("confidence_score", { ascending: false });

    return {
      success: true,
      data: {
        project: projectData,
        files: (fileData ?? []) as ProjectFile[],
        techStacks: (techData ?? []) as TechStackItem[],
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getProjectStatus(
  projectId: string,
): Promise<GetProjectStatusResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("projects")
      .select("status")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return { success: false, error: "Project not found" };
    }

    return { success: true, status: data.status };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ─── Analysis Pipeline ──────────────────────────────────────────────

type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
type AnalysisJobUpdate = Database["public"]["Tables"]["analysis_jobs"]["Update"];
type TechStackInsert = Database["public"]["Tables"]["tech_stacks"]["Insert"];
type TechCategory = Database["public"]["Enums"]["tech_category"];
type Importance = Database["public"]["Enums"]["importance"];

const VALID_CATEGORIES = new Set<TechCategory>([
  "framework", "language", "database", "auth", "deploy",
  "styling", "testing", "build_tool", "library", "other",
]);

const VALID_IMPORTANCE = new Set<Importance>([
  "core", "supporting", "dev_dependency",
]);

async function runAnalysisPipeline(
  projectId: string,
  userId: string,
  jobId: string,
): Promise<void> {
  const supabase = createServiceClient();

  try {
    const processingUpdate: AnalysisJobUpdate = {
      status: "processing",
      started_at: new Date().toISOString(),
    };
    await supabase.from("analysis_jobs").update(processingUpdate).eq("id", jobId);

    const { data: files, error: filesError } = await supabase
      .from("project_files")
      .select("file_name, file_path, file_type, raw_content")
      .eq("project_id", projectId);

    if (filesError || !files || files.length === 0) {
      throw new Error("Failed to load project files");
    }

    // Decrypt raw_content for all files
    const decryptedFiles = files.map((f) => ({
      ...f,
      raw_content: f.raw_content ? decryptContent(f.raw_content) : f.raw_content,
    }));

    const techHints = extractTechHints(decryptedFiles);

    const llmKeyResult = await getDefaultLlmKeyWithDiagnosis(userId);
    if (!llmKeyResult.data) {
      throw new Error(llmKeyErrorMessage(llmKeyResult.error));
    }
    const llmKeyData = llmKeyResult.data;

    const provider = createLLMProvider(llmKeyData.provider, llmKeyData.apiKey);

    await supabase
      .from("analysis_jobs")
      .update({ llm_provider: provider.providerName, llm_model: provider.modelName })
      .eq("id", jobId);

    // Check for existing digest or generate one on the fly
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

    let digestPromptOverride: string | undefined;

    if (digestFile?.raw_content) {
      // Digest already exists — use it directly
      digestPromptOverride = buildDigestAnalysisPrompt(
        digestFile.raw_content,
        mappedHints,
      );
    } else {
      // No digest saved — generate one on the fly
      const { data: projectData } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();

      const projectName = projectData?.name ?? "Unknown Project";
      const nonDigestFiles = decryptedFiles.filter((f) => f.file_name !== "_project_digest.md");
      const digest = generateDigest(projectName, nonDigestFiles);
      const digestMarkdown = digestToMarkdown(digest);
      digestPromptOverride = buildDigestAnalysisPrompt(
        digestMarkdown,
        mappedHints,
      );
    }

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
      promptOverride: digestPromptOverride,
    };

    const analysisOutput = await provider.analyze(analysisInput);

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
          ? (tech.relationships as unknown as TechStackInsert["relationships"])
          : null,
      };

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
              ? (tech.relationships as unknown as TechStackInsert["relationships"])
              : null,
          })
          .eq("id", existingTech.id);
      } else {
        await supabase.from("tech_stacks").insert(techStackData);
      }
    }

    const techSummary = {
      architecture_summary: analysisOutput.architecture_summary,
      total_technologies: analysisOutput.technologies.length,
      core_technologies: analysisOutput.technologies
        .filter((t) => t.importance === "core")
        .map((t) => t.name),
      categories: groupTechByCategory(analysisOutput.technologies),
      analyzed_at: new Date().toISOString(),
      llm_provider: provider.providerName,
      llm_model: provider.modelName,
    };

    const analyzedUpdate: ProjectUpdate = {
      status: "analyzed",
      tech_summary: techSummary,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("projects").update(analyzedUpdate).eq("id", projectId);

    const completedUpdate: AnalysisJobUpdate = {
      status: "completed",
      input_tokens: analysisOutput.input_tokens,
      output_tokens: analysisOutput.output_tokens,
      completed_at: new Date().toISOString(),
    };
    await supabase.from("analysis_jobs").update(completedUpdate).eq("id", jobId);

    // Background KB generation for detected technologies
    generateMissingKBs(
      analysisOutput.technologies.map(t => ({ name: t.name, version: t.version ?? null })),
      provider,
    ).catch(err => console.error("[projects] KB generation failed:", err));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Analysis failed unexpectedly";

    await supabase
      .from("analysis_jobs")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      } as AnalysisJobUpdate)
      .eq("id", jobId);

    await supabase
      .from("projects")
      .update({
        status: "error",
        updated_at: new Date().toISOString(),
      } as ProjectUpdate)
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

function groupTechByCategory(
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

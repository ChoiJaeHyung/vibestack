import type {
  ApiResponse,
  AnalysisResult,
  ConceptHintItem,
  CreateProjectInput,
  CurriculumContext,
  CurriculumStartResult,
  EducationalAnalysisData,
  KnowledgeHintsResult,
  LearningPath,
  Locale,
  ModuleSubmitResult,
  Project,
  ProjectDetail,
  ProjectFile,
  SessionLog,
  TechStackItem,
  TechStackSubmission,
  TechStackSubmitResult,
  TutorContext,
  TutorResponse,
} from "../types.js";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;
const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

// Raw API response types (snake_case from server)
interface RawAnalyzeTriggerResponse {
  job_id: string;
  status: "pending";
}

interface RawAnalysisPollResponse {
  job_id: string;
  status: string;
  error_message: string | null;
  tech_stacks: RawTechStack[];
  started_at: string | null;
  completed_at: string | null;
}

interface RawTechStack {
  technology_name: string;
  category: string;
  version: string | null;
  confidence_score: number;
  importance: string;
  description: string | null;
}

interface RawLearningPathResponse {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  total_modules: number;
  status: string;
  created_at: string;
  modules: RawLearningModule[];
}

interface RawLearningModule {
  id: string;
  title: string;
  description: string | null;
  module_order: number;
  estimated_minutes: number | null;
  topics: string[];
  status: string;
}

interface RawTutorResponse {
  answer: string;
  conversation_id: string;
}

interface RawSessionResponse {
  session_id: string;
}

export class VibeUnivClient {
  private apiKey: string;
  private baseUrl: string;
  private cachedLocale: Locale | null = null;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async getUserLocale(): Promise<Locale> {
    if (this.cachedLocale) return this.cachedLocale;
    try {
      const data = await this.request<{ locale: Locale }>("GET", "/user/locale");
      this.cachedLocale = data.locale;
      return data.locale;
    } catch {
      return "ko";
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error(
        "VIBEUNIV_API_KEY is not configured. " +
          'Add it to your MCP server config\'s "env" block:\n\n' +
          '  "env": { "VIBEUNIV_API_KEY": "your-api-key-here" }\n\n' +
          "Get your API key at https://vibeuniv.com/settings/api"
      );
    }

    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "vibeuniv-mcp-server/0.3.9",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `Request to ${path} timed out after ${REQUEST_TIMEOUT_MS / 1000}s. ` +
            "The server may be overloaded — please try again."
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    const json = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !json.success) {
      const errorMessage =
        json.error || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    if (json.data === undefined) {
      throw new Error("API response missing data field");
    }

    return json.data;
  }

  async createProject(data: CreateProjectInput): Promise<Project> {
    return this.request<Project>("POST", "/projects", data);
  }

  async uploadFiles(projectId: string, files: ProjectFile[]): Promise<void> {
    const payload = files.map((f) => ({
      file_name: f.name,
      file_path: f.relativePath,
      content: f.content,
      content_hash: f.sha256,
    }));
    await this.request<void>("POST", `/projects/${projectId}/files`, {
      files: payload,
    });
  }

  async triggerAnalysis(projectId: string): Promise<AnalysisResult> {
    const raw = await this.request<RawAnalyzeTriggerResponse>(
      "POST",
      `/projects/${projectId}/analyze`
    );

    const result: AnalysisResult = {
      id: raw.job_id,
      projectId,
      status: raw.status,
      createdAt: new Date().toISOString(),
    };

    if (result.status === "completed") {
      return result;
    }

    return this.pollAnalysis(projectId, result.id);
  }

  private async pollAnalysis(
    projectId: string,
    jobId: string
  ): Promise<AnalysisResult> {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const raw = await this.request<RawAnalysisPollResponse>(
        "GET",
        `/projects/${projectId}/analyze/${jobId}`
      );

      const result: AnalysisResult = {
        id: raw.job_id,
        projectId,
        status: raw.status as AnalysisResult["status"],
        errorMessage: raw.error_message ?? undefined,
        techStack: raw.tech_stacks.map((t) => ({
          name: t.technology_name,
          category: t.category,
          version: t.version ?? undefined,
          confidence: t.confidence_score,
          importance: t.importance,
        })),
        startedAt: raw.started_at ?? undefined,
        completedAt: raw.completed_at ?? undefined,
        createdAt: raw.started_at ?? new Date().toISOString(),
      };

      if (result.status === "completed" || result.status === "failed") {
        return result;
      }

      console.error(
        `[vibeuniv] Analysis in progress... (attempt ${i + 1}/${MAX_POLL_ATTEMPTS})`
      );
    }

    throw new Error("Analysis timed out. Please try again later.");
  }

  async getLearningPath(projectId: string): Promise<LearningPath> {
    const raw = await this.request<RawLearningPathResponse>(
      "GET",
      `/projects/${projectId}/learning`
    );

    return {
      id: raw.id,
      projectId,
      title: raw.title,
      description: raw.description ?? undefined,
      difficulty: raw.difficulty,
      totalModules: raw.total_modules,
      status: raw.status,
      createdAt: raw.created_at,
      modules: raw.modules.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description ?? "",
        topics: m.topics ?? [],
        order: m.module_order,
        estimatedMinutes: m.estimated_minutes ?? undefined,
        status: m.status,
      })),
    };
  }

  async logSession(projectId: string, data: SessionLog): Promise<string> {
    const raw = await this.request<RawSessionResponse>(
      "POST",
      `/projects/${projectId}/sessions`,
      {
        summary: data.summary,
        files_changed: data.filesChanged,
      }
    );
    return raw.session_id;
  }

  async askTutor(
    projectId: string,
    question: string,
    conversationId?: string
  ): Promise<TutorResponse> {
    const raw = await this.request<RawTutorResponse>(
      "POST",
      `/projects/${projectId}/tutor`,
      {
        question,
        conversation_id: conversationId,
      }
    );
    return {
      answer: raw.answer,
      conversationId: raw.conversation_id,
    };
  }

  async submitEducationalAnalysis(projectId: string, analysisData: Record<string, unknown>): Promise<void> {
    await this.request<void>(
      "POST",
      `/projects/${projectId}/educational-analysis`,
      { analysis_data: analysisData }
    );
  }

  async getTechStacks(projectId: string): Promise<TechStackItem[]> {
    interface RawStackCategory {
      category: string;
      technologies: Array<{
        id: string;
        technology_name: string;
        version: string | null;
        confidence_score: number;
        importance: string;
        description: string | null;
      }>;
    }

    interface RawStackResponse {
      project_id: string;
      total_technologies: number;
      categories: RawStackCategory[];
    }

    const raw = await this.request<RawStackResponse>(
      "GET",
      `/projects/${projectId}/stack`
    );

    const items: TechStackItem[] = [];
    for (const cat of raw.categories) {
      for (const tech of cat.technologies) {
        items.push({
          name: tech.technology_name,
          category: cat.category,
          version: tech.version ?? undefined,
          confidence: tech.confidence_score,
          importance: tech.importance,
        });
      }
    }
    return items;
  }

  async getKnowledgeHints(techNames: string[]): Promise<KnowledgeHintsResult> {
    interface RawKnowledgeResponse {
      techs: Record<string, ConceptHintItem[]>;
      available_count: number;
      requested_count: number;
    }

    const techsParam = encodeURIComponent(techNames.join(","));
    const raw = await this.request<RawKnowledgeResponse>(
      "GET",
      `/knowledge?techs=${techsParam}`
    );

    return {
      techs: raw.techs,
      availableCount: raw.available_count,
      requestedCount: raw.requested_count,
    };
  }

  async getEducationalAnalysis(projectId: string): Promise<EducationalAnalysisData | null> {
    try {
      return await this.request<EducationalAnalysisData>(
        "GET",
        `/projects/${projectId}/educational-analysis`
      );
    } catch (err) {
      console.error(`[vibeuniv] Educational analysis fetch failed (non-fatal): ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  // ─── Local-First Methods (Phase A) ──────────────────────────────

  async getProjectDetail(projectId: string): Promise<ProjectDetail> {
    return this.request<ProjectDetail>(
      "GET",
      `/projects/${projectId}/detail`,
    );
  }

  async submitTechStacks(
    projectId: string,
    submission: TechStackSubmission,
  ): Promise<TechStackSubmitResult> {
    return this.request<TechStackSubmitResult>(
      "POST",
      `/projects/${projectId}/tech-stacks`,
      submission,
    );
  }

  async getTutorContext(projectId: string): Promise<TutorContext> {
    return this.request<TutorContext>(
      "GET",
      `/projects/${projectId}/tutor-context`,
    );
  }

  async getCurriculumContext(projectId: string): Promise<CurriculumContext> {
    return this.request<CurriculumContext>(
      "GET",
      `/projects/${projectId}/curriculum-context`,
    );
  }

  async createCurriculum(projectId: string, data: {
    title: string;
    description: string;
    difficulty: string;
    total_modules: number;
    estimated_hours?: number;
  }): Promise<CurriculumStartResult> {
    interface RawResponse {
      learning_path_id: string;
      status: string;
    }

    const raw = await this.request<RawResponse>(
      "POST",
      `/projects/${projectId}/curriculum/start`,
      data,
    );

    return {
      learningPathId: raw.learning_path_id,
      status: raw.status,
    };
  }

  async submitModule(projectId: string, pathId: string, module: {
    module_order: number;
    title: string;
    description: string;
    module_type: string;
    tech_name: string;
    estimated_minutes?: number;
    concept_keys?: string[];
    content: { sections: unknown[] };
  }): Promise<ModuleSubmitResult> {
    interface RawResponse {
      module_id: string;
      module_order: number;
      submitted: number;
      total: number;
      status: string;
    }

    const raw = await this.request<RawResponse>(
      "POST",
      `/projects/${projectId}/curriculum/${pathId}/modules`,
      module,
    );

    return {
      moduleId: raw.module_id,
      moduleOrder: raw.module_order,
      submitted: raw.submitted,
      total: raw.total,
      status: raw.status,
    };
  }

  /**
   * Try to assemble a curriculum from pre-built templates on the server.
   * Returns the result if templates are available, null if not.
   */
  async tryAssembleCurriculum(
    projectId: string,
    difficulty: string,
  ): Promise<{
    mode: "prebuilt" | "instruction";
    learningPathId?: string;
    moduleCount?: number;
    message?: string;
  } | null> {
    try {
      interface RawAssembleResponse {
        mode: "prebuilt" | "instruction";
        learning_path_id?: string;
        module_count?: number;
        message?: string;
      }

      const raw = await this.request<RawAssembleResponse>(
        "POST",
        `/projects/${projectId}/curriculum/assemble`,
        { difficulty },
      );

      return {
        mode: raw.mode,
        learningPathId: raw.learning_path_id,
        moduleCount: raw.module_count,
        message: raw.message,
      };
    } catch {
      // Assembler not available — fall back to instruction mode
      return null;
    }
  }
}

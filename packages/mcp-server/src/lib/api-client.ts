import type {
  ApiResponse,
  AnalysisResult,
  CreateProjectInput,
  CurriculumSubmitResult,
  LearningPath,
  Project,
  ProjectFile,
  SessionLog,
  TechStackItem,
  TutorResponse,
} from "../types.js";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

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

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
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
      "User-Agent": "vibeuniv-mcp-server/0.2.0",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

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

  async submitCurriculum(
    projectId: string,
    curriculum: Record<string, unknown>,
  ): Promise<CurriculumSubmitResult> {
    interface RawCurriculumResponse {
      learning_path_id: string;
      title: string;
      total_modules: number;
    }

    const raw = await this.request<RawCurriculumResponse>(
      "POST",
      `/projects/${projectId}/curriculum`,
      { curriculum }
    );

    return {
      learningPathId: raw.learning_path_id,
      title: raw.title,
      totalModules: raw.total_modules,
    };
  }
}

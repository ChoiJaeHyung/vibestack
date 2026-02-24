import type {
  ApiResponse,
  AnalysisResult,
  CreateProjectInput,
  LearningPath,
  Project,
  ProjectFile,
  SessionLog,
} from "../types.js";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

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
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "vibeuniv-mcp-server/0.1.0",
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
    const job = await this.request<AnalysisResult>(
      "POST",
      `/projects/${projectId}/analyze`
    );

    if (job.status === "completed") {
      return job;
    }

    return this.pollAnalysis(projectId, job.id);
  }

  private async pollAnalysis(
    projectId: string,
    jobId: string
  ): Promise<AnalysisResult> {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const result = await this.request<AnalysisResult>(
        "GET",
        `/projects/${projectId}/analyze/${jobId}`
      );

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
    return this.request<LearningPath>(
      "GET",
      `/projects/${projectId}/learning`
    );
  }

  async logSession(projectId: string, data: SessionLog): Promise<void> {
    await this.request<void>("POST", `/projects/${projectId}/sessions`, data);
  }

  async askTutor(projectId: string, question: string): Promise<string> {
    const result = await this.request<{ answer: string }>(
      "POST",
      `/projects/${projectId}/tutor`,
      { question }
    );
    return result.answer;
  }

  async submitEducationalAnalysis(projectId: string, analysisData: Record<string, unknown>): Promise<void> {
    await this.request<void>(
      "POST",
      `/projects/${projectId}/educational-analysis`,
      { analysis_data: analysisData }
    );
  }
}

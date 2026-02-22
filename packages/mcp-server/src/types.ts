export interface ProjectFile {
  name: string;
  relativePath: string;
  size: number;
  content: string;
  sha256: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface AnalysisResult {
  id: string;
  projectId: string;
  status: "pending" | "processing" | "completed" | "failed";
  techStack?: TechStackItem[];
  summary?: string;
  createdAt: string;
}

export interface TechStackItem {
  name: string;
  category: string;
  version?: string;
  confidence: number;
}

export interface LearningPath {
  id: string;
  projectId: string;
  modules: LearningModule[];
  createdAt: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  topics: string[];
  order: number;
}

export interface SessionLog {
  summary: string;
  filesChanged?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

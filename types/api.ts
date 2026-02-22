export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  source_platform?: string;
  source_channel?: "mcp" | "api" | "cli" | "web_upload";
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  status: "created" | "uploaded" | "analyzing" | "analyzed" | "error";
  source_platform: string | null;
  source_channel: string | null;
  tech_summary: unknown | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetailResponse extends ProjectResponse {
  files: ProjectFileResponse[];
  tech_stacks: TechStackResponse[];
}

export interface ProjectFileResponse {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string | null;
  file_size: number | null;
  content_hash: string | null;
  created_at: string;
}

export interface TechStackResponse {
  id: string;
  technology_name: string;
  category: string;
  subcategory: string | null;
  version: string | null;
  confidence_score: number;
  importance: string;
  description: string | null;
}

export interface FileUploadRequest {
  files: FileUploadItem[];
}

export interface FileUploadItem {
  file_name: string;
  file_path?: string;
  file_type: "dependency" | "ai_config" | "build_config" | "source_code" | "other";
  content: string;
  content_hash?: string;
}

export interface AnalyzeResponse {
  job_id: string;
  status: "pending";
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface ApiKeyCreateResponse {
  id: string;
  key: string;
  key_prefix: string;
  name: string;
  created_at: string;
}

export interface ApiKeyListItem {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

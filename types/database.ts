export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type PlanType = "free" | "pro" | "team";
type SourceChannel = "mcp" | "api" | "cli" | "web_upload";
type ProjectStatus = "created" | "uploaded" | "analyzing" | "analyzed" | "error";
type FileType = "dependency" | "ai_config" | "build_config" | "source_code" | "other";
type TechCategory = "framework" | "language" | "database" | "auth" | "deploy" | "styling" | "testing" | "build_tool" | "library" | "other";
type Importance = "core" | "supporting" | "dev_dependency";
type JobType = "tech_analysis" | "learning_generation" | "full_analysis";
type JobStatus = "pending" | "processing" | "completed" | "failed";
type Difficulty = "beginner" | "intermediate" | "advanced";
type LearningPathStatus = "draft" | "active" | "completed" | "archived";
type ModuleType = "concept" | "practical" | "quiz" | "project_walkthrough";
type ProgressStatus = "not_started" | "in_progress" | "completed" | "skipped";
type ContextType = "tech_analysis" | "learning" | "general" | "project_walkthrough";
type LlmProvider = "anthropic" | "openai" | "google" | "groq" | "mistral" | "deepseek" | "cohere" | "together" | "fireworks" | "xai" | "openrouter";

export type UserRole = "user" | "admin" | "super_admin";
type SettingCategory = "llm_config" | "pricing" | "announcement" | "feature_toggle" | "general";
type AnnouncementType = "info" | "warning" | "maintenance" | "update";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          plan_type: PlanType;
          plan_expires_at: string | null;
          stripe_customer_id: string | null;
          onboarding_completed: boolean;
          role: UserRole;
          is_banned: boolean;
          banned_at: string | null;
          ban_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          plan_type?: PlanType;
          plan_expires_at?: string | null;
          stripe_customer_id?: string | null;
          onboarding_completed?: boolean;
          role?: UserRole;
          is_banned?: boolean;
          banned_at?: string | null;
          ban_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          plan_type?: PlanType;
          plan_expires_at?: string | null;
          stripe_customer_id?: string | null;
          onboarding_completed?: boolean;
          role?: UserRole;
          is_banned?: boolean;
          banned_at?: string | null;
          ban_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_api_keys: {
        Row: {
          id: string;
          user_id: string;
          key_hash: string;
          key_prefix: string;
          name: string;
          last_used_at: string | null;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          key_hash: string;
          key_prefix: string;
          name?: string;
          last_used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          key_hash?: string;
          key_prefix?: string;
          name?: string;
          last_used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_llm_keys: {
        Row: {
          id: string;
          user_id: string;
          provider: LlmProvider;
          encrypted_key: string;
          key_iv: string;
          display_hint: string | null;
          is_valid: boolean;
          is_default: boolean;
          last_verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: LlmProvider;
          encrypted_key: string;
          key_iv: string;
          display_hint?: string | null;
          is_valid?: boolean;
          is_default?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: LlmProvider;
          encrypted_key?: string;
          key_iv?: string;
          display_hint?: string | null;
          is_valid?: boolean;
          is_default?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          source_platform: string | null;
          source_channel: SourceChannel | null;
          status: ProjectStatus;
          last_synced_at: string | null;
          tech_summary: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          source_platform?: string | null;
          source_channel?: SourceChannel | null;
          status?: ProjectStatus;
          last_synced_at?: string | null;
          tech_summary?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          source_platform?: string | null;
          source_channel?: SourceChannel | null;
          status?: ProjectStatus;
          last_synced_at?: string | null;
          tech_summary?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_files: {
        Row: {
          id: string;
          project_id: string;
          file_name: string;
          file_type: FileType;
          file_path: string | null;
          storage_url: string | null;
          raw_content: string | null;
          file_size: number | null;
          content_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          file_name: string;
          file_type: FileType;
          file_path?: string | null;
          storage_url?: string | null;
          raw_content?: string | null;
          file_size?: number | null;
          content_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          file_name?: string;
          file_type?: FileType;
          file_path?: string | null;
          storage_url?: string | null;
          raw_content?: string | null;
          file_size?: number | null;
          content_hash?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tech_stacks: {
        Row: {
          id: string;
          project_id: string;
          technology_name: string;
          category: TechCategory;
          subcategory: string | null;
          version: string | null;
          confidence_score: number;
          detected_from: string[] | null;
          description: string | null;
          importance: Importance;
          relationships: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          technology_name: string;
          category: TechCategory;
          subcategory?: string | null;
          version?: string | null;
          confidence_score?: number;
          detected_from?: string[] | null;
          description?: string | null;
          importance?: Importance;
          relationships?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          technology_name?: string;
          category?: TechCategory;
          subcategory?: string | null;
          version?: string | null;
          confidence_score?: number;
          detected_from?: string[] | null;
          description?: string | null;
          importance?: Importance;
          relationships?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      analysis_jobs: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          job_type: JobType;
          status: JobStatus;
          llm_provider: string | null;
          llm_model: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          cost_usd: number | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          job_type: JobType;
          status?: JobStatus;
          llm_provider?: string | null;
          llm_model?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cost_usd?: number | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          job_type?: JobType;
          status?: JobStatus;
          llm_provider?: string | null;
          llm_model?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cost_usd?: number | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      learning_paths: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          description: string | null;
          difficulty: Difficulty | null;
          estimated_hours: number | null;
          total_modules: number;
          llm_provider: string | null;
          status: LearningPathStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          difficulty?: Difficulty | null;
          estimated_hours?: number | null;
          total_modules?: number;
          llm_provider?: string | null;
          status?: LearningPathStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          difficulty?: Difficulty | null;
          estimated_hours?: number | null;
          total_modules?: number;
          llm_provider?: string | null;
          status?: LearningPathStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      learning_modules: {
        Row: {
          id: string;
          learning_path_id: string;
          title: string;
          description: string | null;
          content: Json;
          module_order: number;
          module_type: ModuleType | null;
          estimated_minutes: number | null;
          tech_stack_id: string | null;
          prerequisites: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          learning_path_id: string;
          title: string;
          description?: string | null;
          content?: Json;
          module_order: number;
          module_type?: ModuleType | null;
          estimated_minutes?: number | null;
          tech_stack_id?: string | null;
          prerequisites?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          learning_path_id?: string;
          title?: string;
          description?: string | null;
          content?: Json;
          module_order?: number;
          module_type?: ModuleType | null;
          estimated_minutes?: number | null;
          tech_stack_id?: string | null;
          prerequisites?: string[] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      learning_progress: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          status: ProgressStatus;
          score: number | null;
          time_spent: number | null;
          attempts: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module_id: string;
          status?: ProgressStatus;
          score?: number | null;
          time_spent?: number | null;
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          module_id?: string;
          status?: ProgressStatus;
          score?: number | null;
          time_spent?: number | null;
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          learning_path_id: string | null;
          title: string | null;
          messages: Json;
          context_type: ContextType | null;
          llm_provider: string | null;
          total_tokens: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          learning_path_id?: string | null;
          title?: string | null;
          messages?: Json;
          context_type?: ContextType | null;
          llm_provider?: string | null;
          total_tokens?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          learning_path_id?: string | null;
          title?: string | null;
          messages?: Json;
          context_type?: ContextType | null;
          llm_provider?: string | null;
          total_tokens?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mcp_sessions: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          client_tool: string;
          client_version: string | null;
          session_start: string;
          session_end: string | null;
          tools_called: Json;
          files_synced: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          client_tool: string;
          client_version?: string | null;
          session_start?: string;
          session_end?: string | null;
          tools_called?: Json;
          files_synced?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          client_tool?: string;
          client_version?: string | null;
          session_start?: string;
          session_end?: string | null;
          tools_called?: Json;
          files_synced?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: Json;
          category: SettingCategory;
          description: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setting_key: string;
          setting_value?: Json;
          category: SettingCategory;
          description?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          setting_key?: string;
          setting_value?: Json;
          category?: SettingCategory;
          description?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          announcement_type: AnnouncementType;
          is_active: boolean;
          starts_at: string;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          announcement_type?: AnnouncementType;
          is_active?: boolean;
          starts_at?: string;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          announcement_type?: AnnouncementType;
          is_active?: boolean;
          starts_at?: string;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string;
          action_type: string;
          target_type: string | null;
          target_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action_type: string;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action_type?: string;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      plan_type: PlanType;
      source_channel: SourceChannel;
      project_status: ProjectStatus;
      file_type: FileType;
      tech_category: TechCategory;
      importance: Importance;
      job_type: JobType;
      job_status: JobStatus;
      difficulty: Difficulty;
      learning_path_status: LearningPathStatus;
      module_type: ModuleType;
      progress_status: ProgressStatus;
      context_type: ContextType;
      llm_provider: LlmProvider;
      user_role: UserRole;
      setting_category: SettingCategory;
      announcement_type: AnnouncementType;
    };
  };
}

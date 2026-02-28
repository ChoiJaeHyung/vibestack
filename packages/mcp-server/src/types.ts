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
  errorMessage?: string;
  techStack?: TechStackItem[];
  summary?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TechStackItem {
  name: string;
  category: string;
  version?: string;
  confidence: number;
  importance: string;
}

export interface LearningPath {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  difficulty: string;
  totalModules: number;
  status: string;
  modules: LearningModule[];
  createdAt: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  topics: string[];
  order: number;
  estimatedMinutes?: number;
  status: string;
}

export interface SessionLog {
  summary: string;
  filesChanged?: string[];
}

export interface TutorResponse {
  answer: string;
  conversationId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CurriculumSubmitResult {
  learningPathId: string;
  title: string;
  totalModules: number;
}

export interface ConceptHintItem {
  concept_key: string;
  concept_name: string;
  key_points: string[];
  common_quiz_topics: string[];
  prerequisite_concepts: string[];
  tags: string[];
}

export interface KnowledgeHintsResult {
  techs: Record<string, ConceptHintItem[]>;
  availableCount: number;
  requestedCount: number;
}

// ─── Local-First Types (Phase A) ─────────────────────────────────

// Project detail with file contents (for local analysis)
export interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  files: Array<{
    file_name: string;
    file_path: string;
    content: string;
  }>;
  allFileList?: Array<{
    file_name: string;
    file_path: string;
  }>;
  existingTechStacks: TechStackItem[];
}

// Tech stack submission from local AI analysis
export interface TechStackSubmission {
  technologies: Array<{
    name: string;
    category: string;
    version?: string;
    confidence: number;
    importance: string;
    description?: string;
  }>;
  architecture_summary?: string;
}

export interface TechStackSubmitResult {
  savedCount: number;
  projectStatus: string;
}

// Tutor context for local AI tutoring
export interface TutorContext {
  techStacks: Array<{
    technology_name: string;
    category: string;
    description: string | null;
  }>;
  files: Array<{
    file_name: string;
    content: string;
  }>;
  learningContext?: {
    path_title: string;
    current_module: string;
  };
}

// Curriculum context (combined tech stacks + KB hints + educational analysis)
export interface CurriculumContext {
  techStacks: TechStackItem[];
  knowledgeHints: Record<string, ConceptHintItem[]>;
  educationalAnalysis: EducationalAnalysisData | null;
}

// ─── Educational Analysis ────────────────────────────────────────

export interface EducationalAnalysisData {
  project_overview: {
    one_liner: string;
    app_type: string;
    target_users: string;
    core_features: string[];
    tech_stack_metaphors: Array<{ tech_name: string; metaphor: string }>;
  };
  user_flows: Array<{
    name: string;
    trigger: string;
    difficulty: string;
    steps: Array<{ description: string; file: string; line_range: string }>;
  }>;
  file_analysis: Array<{
    path: string;
    role: string;
    complexity: number;
    difficulty: string;
    key_concepts: string[];
    prerequisites: string[];
    gotchas: string[];
    teaching_notes: string;
  }>;
  learning_priorities: {
    beginner: { start_with: string[]; focus_on: string[]; skip_for_now: string[] };
    intermediate: { start_with: string[]; focus_on: string[]; deep_dive: string[] };
    advanced: { start_with: string[]; focus_on: string[]; challenge_topics: string[] };
  };
  repeated_patterns: Array<{
    name: string;
    description: string;
    occurrences: Array<{ file: string; line_range: string }>;
    teaching_value: string;
  }>;
  code_quality: {
    good_practices: Array<{ description: string; concept: string }>;
    improvement_areas: Array<{ description: string; severity: string; teaching_opportunity: string }>;
  };
}

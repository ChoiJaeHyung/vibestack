export type DifficultyTier = "beginner" | "intermediate" | "advanced";

export interface CrossTechLink {
  tech: string;               // normalized tech name ("react", "python")
  concept_key: string;        // target concept key
  relation: "foundation" | "similar" | "extends" | "alternative";
}

/** Code-level markers for matching concepts to project source files */
export interface CodeSignature {
  import_markers: string[];   // import identifiers: ["useState", "from 'react'"]
  syntax_markers: string[];   // code patterns: ["const [", "useState("]
  file_markers: string[];     // file path globs: ["**/components/**"]
  config_markers: string[];   // config file entries: ["next.config.* > images"]
}

export interface ConceptHint {
  concept_key: string;        // "app-router"
  concept_name: string;       // "App Router 이해하기"
  key_points: string[];       // 핵심 포인트 3-5개
  common_quiz_topics: string[]; // 좋은 퀴즈 주제
  prerequisite_concepts: string[]; // 선행 개념 키
  tags: string[];             // 매칭용 태그
  difficulty_tier?: DifficultyTier;
  category?: string;          // "fundamentals" | "state-management" | "routing" 등
  cross_tech_links?: CrossTechLink[];
  code_signature?: CodeSignature;
}

export type TechCategory = "language" | "frontend" | "backend" | "database" | "css" | "mobile" | "devops";

export interface TechKnowledge {
  technology_name: string;    // "Next.js"
  version: string;            // "15"
  category: TechCategory;
  concepts: ConceptHint[];
}

/** Row from technology_knowledge DB table */
export interface TechnologyKnowledgeRow {
  id: string;
  technology_name: string;
  technology_name_normalized: string;
  version: string | null;
  concepts: ConceptHint[];
  source: "seed" | "llm_generated";
  generation_status: "ready" | "generating" | "failed";
  llm_provider: string | null;
  llm_model: string | null;
  generation_error: string | null;
  generated_at: string | null;
  locale: "ko" | "en";
  created_at: string;
  updated_at: string;
}

/** Input for generating KB for a technology */
export interface KBGenerationInput {
  name: string;
  version: string | null;
}

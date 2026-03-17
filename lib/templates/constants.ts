// ─── Ontology Template Engine Constants ──────────────────────────────────
// Design doc: docs/02-design/features/ontology-template-engine.design.md Section 2.3

// ─── Mastery Thresholds ─────────────────────────────────────────────────
// Aligned with lib/prompts/learning-roadmap.ts mastery levels

/** Mastery level at or above which a concept is considered MASTERED (skip in curriculum) */
export const MASTERY_THRESHOLD_MASTERED = 80;

/** Mastery level at or above which a concept is considered LEARNING (review module) */
export const MASTERY_THRESHOLD_LEARNING = 30;

/** Below MASTERY_THRESHOLD_LEARNING is considered NEW (full dedicated module) */
export const MASTERY_THRESHOLD_NEW = 0;

export const MASTERY_THRESHOLDS = {
  MASTERED: MASTERY_THRESHOLD_MASTERED,
  LEARNING: MASTERY_THRESHOLD_LEARNING,
  NEW: MASTERY_THRESHOLD_NEW,
} as const;

// ─── Section Type Weights ───────────────────────────────────────────────
// Used by template-selector to determine section composition per module type.
// Values represent approximate count targets (scaled by getRequiredSectionCounts).

export interface SectionTypeWeight {
  explanation: number;
  code_example: number;
  quiz_question: number;
  reflection: number;
}

export const SECTION_TYPE_WEIGHTS: Record<string, SectionTypeWeight> = {
  concept: {
    explanation: 2.5,
    code_example: 1,
    quiz_question: 1,
    reflection: 0,
  },
  practical: {
    explanation: 1,
    code_example: 2.5,
    quiz_question: 0.5,
    reflection: 0,
  },
  quiz: {
    explanation: 1,
    code_example: 0.5,
    quiz_question: 2.5,
    reflection: 0,
  },
  project_walkthrough: {
    explanation: 2,
    code_example: 1.5,
    quiz_question: 0,
    reflection: 1,
  },
};

// ─── Grouping Configs ───────────────────────────────────────────────────

export interface GroupingConfig {
  difficulty: string;
  /** Number of concepts per module */
  conceptsPerModule: { min: number; max: number };
  /** Number of sections per module (aligned with curriculum-validation.ts) */
  sectionsPerModule: { min: number; max: number };
  /** Module type distribution (fractions summing to 1.0) */
  typeDistribution: {
    concept: number;
    practical: number;
    quiz: number;
    project_walkthrough: number;
  };
}

export const GROUPING_CONFIGS: Record<string, GroupingConfig> = {
  beginner: {
    difficulty: "beginner",
    conceptsPerModule: { min: 2, max: 3 },
    sectionsPerModule: { min: 7, max: 12 },
    typeDistribution: {
      concept: 0.4,
      practical: 0.2,
      quiz: 0.2,
      project_walkthrough: 0.2,
    },
  },
  intermediate: {
    difficulty: "intermediate",
    conceptsPerModule: { min: 3, max: 5 },
    sectionsPerModule: { min: 5, max: 8 },
    typeDistribution: {
      concept: 0.3,
      practical: 0.3,
      quiz: 0.15,
      project_walkthrough: 0.25,
    },
  },
  advanced: {
    difficulty: "advanced",
    conceptsPerModule: { min: 3, max: 5 },
    sectionsPerModule: { min: 5, max: 8 },
    typeDistribution: {
      concept: 0.25,
      practical: 0.3,
      quiz: 0.15,
      project_walkthrough: 0.3,
    },
  },
};

// ─── Valid Section Types (aligned with curriculum-validation.ts) ─────────

export const TEMPLATE_SECTION_TYPES = [
  "explanation",
  "code_example",
  "quiz_question",
  "challenge",
  "reflection",
] as const;

export type TemplateSectionType = (typeof TEMPLATE_SECTION_TYPES)[number];

// ─── Module Types ───────────────────────────────────────────────────────

export const MODULE_TYPES = [
  "concept",
  "practical",
  "quiz",
  "project_walkthrough",
] as const;

export type TemplateModuleType = (typeof MODULE_TYPES)[number];

// ─── Estimated Minutes per Module Type ──────────────────────────────────

export const ESTIMATED_MINUTES: Record<string, number> = {
  concept: 25,
  practical: 30,
  quiz: 15,
  project_walkthrough: 35,
};

// ─── Template Coverage Levels ───────────────────────────────────────────

export type CoverageLevel = "full" | "partial" | "none";

// ─── Minimum modules for a valid curriculum ─────────────────────────────

export const MIN_CURRICULUM_MODULES = 10;

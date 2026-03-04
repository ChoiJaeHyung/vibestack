/**
 * Rule-based code health scorer.
 * Computes 5 category scores + overall weighted average from EducationalAnalysis data.
 * No LLM calls — entirely deterministic.
 */

import type {
  EducationalAnalysis,
  FileAnalysis,
  CodeQuality,
  Architecture,
} from "@/types/educational-analysis";

// ── Types ───────────────────────────────────────────────────────

export interface CategoryScore {
  category: string;
  score: number;
  weight: number;
  details: string;
}

export interface ImprovementItem {
  category: string;
  severity: "info" | "warning" | "important";
  description: string;
  files: string[];
  suggestion: string;
}

export interface HealthScoreResult {
  overallScore: number;
  categories: CategoryScore[];
  improvementItems: ImprovementItem[];
}

// ── Weights ─────────────────────────────────────────────────────

const WEIGHTS = {
  codeQuality: 0.3,
  security: 0.25,
  architecture: 0.2,
  codeStructure: 0.15,
  learnability: 0.1,
} as const;

// ── Scorer ──────────────────────────────────────────────────────

export function calculateHealthScore(
  analysis: EducationalAnalysis,
): HealthScoreResult {
  const improvementItems: ImprovementItem[] = [];

  const qualityScore = scoreCodeQuality(analysis.code_quality, analysis.file_analysis, analysis.repeated_patterns, improvementItems);
  const securityScore = scoreSecurity(analysis.code_quality, improvementItems);
  const architectureScore = scoreArchitecture(analysis.architecture, improvementItems);
  const structureScore = scoreCodeStructure(analysis.file_analysis, improvementItems);
  const learnabilityScore = scoreLearnability(analysis.file_analysis, improvementItems);

  const categories: CategoryScore[] = [
    { category: "code_quality", score: qualityScore, weight: WEIGHTS.codeQuality, details: "File complexity, patterns, good practices" },
    { category: "security", score: securityScore, weight: WEIGHTS.security, details: "Security notes and vulnerabilities" },
    { category: "architecture", score: architectureScore, weight: WEIGHTS.architecture, details: "Layer separation and design patterns" },
    { category: "code_structure", score: structureScore, weight: WEIGHTS.codeStructure, details: "Difficulty distribution and import concentration" },
    { category: "learnability", score: learnabilityScore, weight: WEIGHTS.learnability, details: "Teaching notes and gotchas identification" },
  ];

  const overallScore = Math.round(
    categories.reduce((sum, c) => sum + c.score * c.weight, 0),
  );

  return { overallScore, categories, improvementItems };
}

// ── Category scorers ────────────────────────────────────────────

function scoreCodeQuality(
  quality: CodeQuality,
  files: FileAnalysis[],
  repeatedPatterns: EducationalAnalysis["repeated_patterns"],
  items: ImprovementItem[],
): number {
  let score = 100;

  // Average complexity penalty (1-5 scale, target <= 2.5)
  if (files.length > 0) {
    const avgComplexity =
      files.reduce((sum, f) => sum + f.complexity, 0) / files.length;
    if (avgComplexity > 3.5) {
      score -= 25;
      items.push({
        category: "code_quality",
        severity: "important",
        description: `Average file complexity is high (${avgComplexity.toFixed(1)}/5)`,
        files: files.filter((f) => f.complexity >= 4).map((f) => f.path),
        suggestion: "Consider breaking complex files into smaller modules",
      });
    } else if (avgComplexity > 2.5) {
      score -= 10;
    }
  }

  // Good practices bonus
  const practiceCount = quality.good_practices.length;
  if (practiceCount >= 5) {
    score = Math.min(100, score + 10);
  } else if (practiceCount === 0) {
    score -= 10;
  }

  // Improvement areas penalty
  for (const area of quality.improvement_areas) {
    const penalty =
      area.severity === "important" ? 15 : area.severity === "warning" ? 10 : 5;
    score -= penalty;

    items.push({
      category: "code_quality",
      severity: area.severity,
      description: area.description,
      files: area.files,
      suggestion: area.teaching_opportunity,
    });
  }

  // Repeated patterns (mixed signal — useful patterns are good, anti-patterns are bad)
  if (repeatedPatterns.length > 0) {
    score = Math.min(100, score + 5);
  }

  return clamp(score);
}

function scoreSecurity(
  quality: CodeQuality,
  items: ImprovementItem[],
): number {
  let score = 100;

  for (const note of quality.security_notes) {
    // Determine severity heuristically from text
    const text = note.observation.toLowerCase();
    const isImportant =
      text.includes("vulnerab") ||
      text.includes("injection") ||
      text.includes("xss") ||
      text.includes("credential") ||
      text.includes("secret");
    const isWarning =
      text.includes("hardcoded") ||
      text.includes("unsafe") ||
      text.includes("deprecat");

    const severity = isImportant
      ? "important"
      : isWarning
        ? "warning"
        : "info";
    const penalty = isImportant ? 15 : isWarning ? 10 : 5;
    score -= penalty;

    items.push({
      category: "security",
      severity,
      description: note.observation,
      files: note.files,
      suggestion: note.teaching_concept,
    });
  }

  // Bonus for having no security issues
  if (quality.security_notes.length === 0) {
    score = 100;
  }

  return clamp(score);
}

function scoreArchitecture(
  arch: Architecture,
  items: ImprovementItem[],
): number {
  let score = 50; // Start at neutral

  // Layer separation bonus
  const layerCount = arch.layers.length;
  if (layerCount >= 4) {
    score += 25;
  } else if (layerCount >= 2) {
    score += 15;
  } else {
    items.push({
      category: "architecture",
      severity: "warning",
      description: "Project lacks clear architectural layer separation",
      files: [],
      suggestion:
        "Consider separating concerns into layers (e.g., UI, business logic, data access)",
    });
  }

  // Design patterns bonus
  const patternCount = arch.design_patterns.length;
  if (patternCount >= 3) {
    score += 25;
  } else if (patternCount >= 1) {
    score += 15;
  } else {
    items.push({
      category: "architecture",
      severity: "info",
      description: "No recognized design patterns detected",
      files: [],
      suggestion:
        "Using established design patterns improves maintainability and readability",
    });
  }

  return clamp(score);
}

function scoreCodeStructure(
  files: FileAnalysis[],
  items: ImprovementItem[],
): number {
  if (files.length === 0) return 50;

  let score = 80;

  // Difficulty distribution — too many advanced files is bad
  const advancedCount = files.filter(
    (f) => f.difficulty === "advanced",
  ).length;
  const advancedRatio = advancedCount / files.length;

  if (advancedRatio > 0.5) {
    score -= 20;
    items.push({
      category: "code_structure",
      severity: "warning",
      description: `${Math.round(advancedRatio * 100)}% of files are classified as advanced complexity`,
      files: files
        .filter((f) => f.difficulty === "advanced")
        .map((f) => f.path),
      suggestion:
        "Consider simplifying complex files or adding documentation",
    });
  } else if (advancedRatio > 0.3) {
    score -= 10;
  }

  // Import concentration — files with too many imports
  const highImportFiles = files.filter(
    (f) => f.connections.imports_from.length > 10,
  );
  if (highImportFiles.length > 0) {
    score -= 10;
    items.push({
      category: "code_structure",
      severity: "info",
      description: `${highImportFiles.length} file(s) import from more than 10 modules`,
      files: highImportFiles.map((f) => f.path),
      suggestion:
        "High import counts may indicate a file doing too much — consider splitting",
    });
  }

  // Balanced difficulty is a bonus
  const beginnerCount = files.filter(
    (f) => f.difficulty === "beginner",
  ).length;
  const intermediateCount = files.filter(
    (f) => f.difficulty === "intermediate",
  ).length;
  if (beginnerCount > 0 && intermediateCount > 0 && advancedCount > 0) {
    score += 10;
  }

  return clamp(score);
}

function scoreLearnability(
  files: FileAnalysis[],
  items: ImprovementItem[],
): number {
  if (files.length === 0) return 50;

  let score = 70;

  // Teaching notes richness
  const filesWithNotes = files.filter(
    (f) => f.teaching_notes && f.teaching_notes.length > 20,
  );
  const noteRatio = filesWithNotes.length / files.length;

  if (noteRatio >= 0.5) {
    score += 20;
  } else if (noteRatio >= 0.2) {
    score += 10;
  } else {
    items.push({
      category: "learnability",
      severity: "info",
      description: "Most files lack substantial teaching notes",
      files: [],
      suggestion:
        "Adding comments and documentation improves code learnability",
    });
  }

  // Gotchas identification is good (means the analysis is thorough)
  const totalGotchas = files.reduce(
    (sum, f) => sum + f.gotchas.length,
    0,
  );
  if (totalGotchas >= 5) {
    score += 10;
  }

  // Prerequisites presence is good
  const filesWithPrereqs = files.filter(
    (f) => f.prerequisites.length > 0,
  );
  if (filesWithPrereqs.length >= files.length * 0.3) {
    score += 5;
  }

  return clamp(score);
}

// ── Utils ───────────────────────────────────────────────────────

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

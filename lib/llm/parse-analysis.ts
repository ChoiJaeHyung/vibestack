import type { TechnologyResult, AnalysisOutput } from "./types";

const VALID_CATEGORIES = new Set([
  "framework",
  "language",
  "database",
  "auth",
  "deploy",
  "styling",
  "testing",
  "build_tool",
  "library",
  "other",
]);

const VALID_IMPORTANCE = new Set(["core", "supporting", "dev_dependency"]);

interface RawTechnology {
  name?: unknown;
  category?: unknown;
  version?: unknown;
  confidence?: unknown;
  description?: unknown;
  importance?: unknown;
  relationships?: {
    depends_on?: unknown;
    used_with?: unknown;
  };
}

interface RawAnalysisResponse {
  technologies?: unknown[];
  architecture_summary?: unknown;
}

export function parseAnalysisResponse(
  rawText: string,
  inputTokens: number,
  outputTokens: number,
): AnalysisOutput {
  const cleaned = cleanJsonResponse(rawText);
  const parsed = JSON.parse(cleaned) as RawAnalysisResponse;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM response is not a valid JSON object");
  }

  if (!Array.isArray(parsed.technologies)) {
    throw new Error("LLM response missing 'technologies' array");
  }

  const technologies: TechnologyResult[] = parsed.technologies
    .map((tech: unknown) => validateTechnology(tech as RawTechnology))
    .filter((t): t is TechnologyResult => t !== null);

  const architectureSummary =
    typeof parsed.architecture_summary === "string"
      ? parsed.architecture_summary
      : "No architecture summary provided.";

  return {
    technologies,
    architecture_summary: architectureSummary,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  };
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

function validateTechnology(raw: RawTechnology): TechnologyResult | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.name !== "string" || raw.name.trim() === "") return null;

  const category =
    typeof raw.category === "string" && VALID_CATEGORIES.has(raw.category)
      ? raw.category
      : "other";

  const importance =
    typeof raw.importance === "string" && VALID_IMPORTANCE.has(raw.importance)
      ? (raw.importance as "core" | "supporting" | "dev_dependency")
      : "supporting";

  const confidence =
    typeof raw.confidence === "number"
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0.5;

  const description =
    typeof raw.description === "string"
      ? raw.description
      : `${raw.name} technology detected in the project.`;

  const version =
    typeof raw.version === "string" && raw.version.trim() !== ""
      ? raw.version
      : undefined;

  const relationships: TechnologyResult["relationships"] = {};
  if (raw.relationships && typeof raw.relationships === "object") {
    if (Array.isArray(raw.relationships.depends_on)) {
      relationships.depends_on = raw.relationships.depends_on.filter(
        (item): item is string => typeof item === "string",
      );
    }
    if (Array.isArray(raw.relationships.used_with)) {
      relationships.used_with = raw.relationships.used_with.filter(
        (item): item is string => typeof item === "string",
      );
    }
  }

  return {
    name: raw.name,
    category,
    version,
    confidence,
    description,
    importance,
    relationships:
      (relationships.depends_on && relationships.depends_on.length > 0) ||
      (relationships.used_with && relationships.used_with.length > 0)
        ? relationships
        : undefined,
  };
}

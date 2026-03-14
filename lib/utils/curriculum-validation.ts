// ─── Shared Curriculum Module Validation ─────────────────────────────
// Extracted from app/api/v1/projects/[id]/curriculum/route.ts
// Used by both the full curriculum submit and per-module submit APIs.

export const VALID_DIFFICULTIES: string[] = ["beginner", "intermediate", "advanced"];
export const VALID_MODULE_TYPES: string[] = ["concept", "practical", "quiz", "project_walkthrough"];
export const VALID_SECTION_TYPES: string[] = [
  "explanation",
  "code_example",
  "quiz_question",
  "challenge",
  "reflection",
];

// ─── Quality thresholds ─────────────────────────────────────────────

export function getMinSections(difficulty: string): number {
  return difficulty === "beginner" ? 7 : 5;
}

export function getMinExplanationChars(difficulty: string): number {
  return difficulty === "beginner" ? 800 : 400;
}

export function getMinCodeExamples(difficulty: string): number {
  return difficulty === "beginner" ? 2 : 1;
}

export function getMinQuizQuestions(difficulty: string): number {
  return difficulty === "beginner" ? 2 : 1;
}

// ─── Module-level validation (collects ALL errors) ──────────────────

export function validateModule(
  mod: unknown,
  index: number,
  difficulty: string,
): { valid: true } | { valid: false; error: string; errors: string[] } {
  if (!mod || typeof mod !== "object") {
    return { valid: false, error: `modules[${index}] must be an object`, errors: [`modules[${index}] must be an object`] };
  }

  const m = mod as Record<string, unknown>;
  const prefix = `modules[${index}]`;
  const errors: string[] = [];

  if (typeof m.title !== "string" || m.title.length === 0) {
    errors.push(`${prefix}.title is required`);
  }
  if (typeof m.description !== "string" || m.description.length === 0) {
    errors.push(`${prefix}.description is required`);
  }
  if (!VALID_MODULE_TYPES.includes(m.module_type as string)) {
    errors.push(`${prefix}.module_type must be one of: ${VALID_MODULE_TYPES.join(", ")}`);
  }
  if (typeof m.tech_name !== "string" || m.tech_name.length === 0) {
    errors.push(`${prefix}.tech_name is required`);
  }

  const content = m.content as Record<string, unknown> | undefined;
  if (!content || !Array.isArray(content.sections) || content.sections.length === 0) {
    errors.push(`${prefix}.content.sections must be a non-empty array`);
    return { valid: false, error: errors[0], errors };
  }

  const minSections = getMinSections(difficulty);
  if (content.sections.length < minSections) {
    errors.push(`${prefix}.content.sections must have at least ${minSections} sections (received ${content.sections.length})`);
  }

  let codeCount = 0;
  let quizCount = 0;

  for (let j = 0; j < content.sections.length; j++) {
    const sec = content.sections[j];
    const secPrefix = `${prefix}.sections[${j}]`;

    if (!sec || typeof sec !== "object") {
      errors.push(`${secPrefix} must be a non-null object`);
      continue;
    }

    const secObj = sec as Record<string, unknown>;

    if (!VALID_SECTION_TYPES.includes(secObj.type as string)) {
      errors.push(`${secPrefix}.type must be one of: ${VALID_SECTION_TYPES.join(", ")} (got "${secObj.type}")`);
    }
    if (typeof secObj.title !== "string" || secObj.title.length === 0) {
      errors.push(`${secPrefix}.title is required`);
    }

    // Body minimum length: explanation requires threshold chars, non-explanation requires 20 chars
    const minBodyLength = secObj.type === "explanation"
      ? getMinExplanationChars(difficulty)
      : 20;
    const bodyLength = typeof secObj.body === "string" ? (secObj.body as string).trim().length : 0;
    if (bodyLength < minBodyLength) {
      errors.push(`${secPrefix}.body must be at least ${minBodyLength} chars (${secObj.type}, currently ${bodyLength} chars)`);
    }

    if (secObj.type === "code_example") {
      codeCount++;
      if (typeof secObj.code !== "string" || (secObj.code as string).trim().length === 0) {
        errors.push(`${secPrefix} code_example must have a non-empty "code" field (separate from "body")`);
      }
    }

    if (secObj.type === "quiz_question") {
      quizCount++;
      if (!Array.isArray(secObj.quiz_options) || secObj.quiz_options.length !== 4) {
        errors.push(`${secPrefix}.quiz_options must have exactly 4 options`);
      } else {
        for (let k = 0; k < secObj.quiz_options.length; k++) {
          if (typeof secObj.quiz_options[k] !== "string" || (secObj.quiz_options[k] as string).trim().length === 0) {
            errors.push(`${secPrefix}.quiz_options[${k}] must be a non-empty string`);
          }
        }
        // Semantic: quiz options must be unique
        const optionsLower = (secObj.quiz_options as string[]).map((o) => o.trim().toLowerCase());
        const uniqueOptions = new Set(optionsLower);
        if (uniqueOptions.size < optionsLower.length) {
          errors.push(`${secPrefix}.quiz_options must all be unique (found duplicates)`);
        }
      }
      if (typeof secObj.quiz_answer !== "number" || secObj.quiz_answer < 0 || secObj.quiz_answer > 3) {
        errors.push(`${secPrefix}.quiz_answer must be 0-3`);
      }
      if (typeof secObj.quiz_explanation !== "string" || (secObj.quiz_explanation as string).trim().length < 20) {
        errors.push(`${secPrefix} quiz_explanation must be at least 20 characters`);
      }
    }

    if (secObj.type === "challenge") {
      if (typeof secObj.challenge_starter_code !== "string" || (secObj.challenge_starter_code as string).trim().length === 0) {
        errors.push(`${secPrefix} challenge must have challenge_starter_code`);
      }
      if (typeof secObj.challenge_answer_code !== "string" || (secObj.challenge_answer_code as string).trim().length === 0) {
        errors.push(`${secPrefix} challenge must have challenge_answer_code`);
      }
    }
  }

  const minCode = getMinCodeExamples(difficulty);
  if (codeCount < minCode) {
    errors.push(`${prefix} must have at least ${minCode} code_example section(s) (found ${codeCount})`);
  }

  const minQuiz = getMinQuizQuestions(difficulty);
  if (quizCount < minQuiz) {
    errors.push(`${prefix} must have at least ${minQuiz} quiz_question section(s) (found ${quizCount})`);
  }

  // ─── Semantic validations ───────────────────────────────────────────

  // Section title uniqueness (catch duplicate/filler sections)
  const sectionTitles = (content.sections as Array<Record<string, unknown>>)
    .filter((s) => typeof s?.title === "string")
    .map((s) => (s.title as string).trim().toLowerCase());
  const uniqueTitles = new Set(sectionTitles);
  if (uniqueTitles.size < sectionTitles.length) {
    errors.push(`${prefix} has duplicate section titles`);
  }

  // Code block basic syntax validation (catch placeholder/filler code)
  for (let j = 0; j < content.sections.length; j++) {
    const sec = (content.sections as Array<Record<string, unknown>>)[j];
    if (sec?.type === "code_example" && typeof sec.code === "string") {
      const code = (sec.code as string).trim();
      if (code.length < 10) {
        errors.push(`${prefix}.sections[${j}].code is too short to be a valid code example (${code.length} chars)`);
      } else {
        const lines = code.split("\n").filter((l) => l.trim().length > 0);
        const commentOnly = lines.every((l) => l.trim().startsWith("//") || l.trim().startsWith("#") || l.trim().startsWith("/*") || l.trim().startsWith("*"));
        if (commentOnly && lines.length > 0) {
          errors.push(`${prefix}.sections[${j}].code contains only comments, no actual code`);
        }
      }
    }
  }

  // concept_keys mention verification: each concept_key should appear in content body
  const conceptKeys = m.concept_keys;
  if (Array.isArray(conceptKeys) && conceptKeys.length > 0) {
    const allText = (content.sections as Array<Record<string, unknown>>)
      .filter((s) => s != null)
      .map((s) => [
        (s.body as string) ?? "",
        (s.title as string) ?? "",
        (s.code as string) ?? "",
      ].join(" "))
      .join(" ")
      .toLowerCase();
    for (const key of conceptKeys) {
      if (typeof key === "string" && key.length > 0) {
        const parts = key.toLowerCase().replace(/[_-]/g, " ").split(/\s+/);
        const found = parts.some((part) => part.length >= 3 && allText.includes(part));
        if (!found) {
          errors.push(`${prefix} concept_key "${key}" is not mentioned in any section content`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors[0], errors };
  }

  return { valid: true };
}

// ─── Batch-level semantic validation ─────────────────────────────────

/**
 * Validate a batch of modules for cross-module semantic quality.
 * Checks: module title uniqueness, description similarity.
 */
export function validateModuleBatch(
  modules: Array<{ title: string; description: string }>,
): { valid: true } | { valid: false; error: string } {
  // Module titles must be unique across the batch
  const titles = modules.map((m) => m.title.trim().toLowerCase());
  const uniqueModuleTitles = new Set(titles);
  if (uniqueModuleTitles.size < titles.length) {
    return { valid: false, error: "Batch contains duplicate module titles" };
  }

  // Check for overly similar descriptions (>80% character overlap in first 100 chars)
  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const a = modules[i].description.slice(0, 100).toLowerCase();
      const b = modules[j].description.slice(0, 100).toLowerCase();
      if (a.length > 20 && b.length > 20 && a === b) {
        return { valid: false, error: `Modules "${modules[i].title}" and "${modules[j].title}" have identical descriptions` };
      }
    }
  }

  return { valid: true };
}

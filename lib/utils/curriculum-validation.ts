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

// ─── Module-level validation ────────────────────────────────────────

export function validateModule(
  mod: unknown,
  index: number,
  difficulty: string,
): { valid: true } | { valid: false; error: string } {
  if (!mod || typeof mod !== "object") {
    return { valid: false, error: `modules[${index}] must be an object` };
  }

  const m = mod as Record<string, unknown>;
  const prefix = `modules[${index}]`;

  if (typeof m.title !== "string" || m.title.length === 0) {
    return { valid: false, error: `${prefix}.title is required` };
  }
  if (typeof m.description !== "string" || m.description.length === 0) {
    return { valid: false, error: `${prefix}.description is required` };
  }
  if (!VALID_MODULE_TYPES.includes(m.module_type as string)) {
    return { valid: false, error: `${prefix}.module_type must be one of: ${VALID_MODULE_TYPES.join(", ")}` };
  }
  if (typeof m.tech_name !== "string" || m.tech_name.length === 0) {
    return { valid: false, error: `${prefix}.tech_name is required` };
  }

  const content = m.content as Record<string, unknown> | undefined;
  if (!content || !Array.isArray(content.sections) || content.sections.length === 0) {
    return { valid: false, error: `${prefix}.content.sections must be a non-empty array` };
  }

  const minSections = getMinSections(difficulty);
  if (content.sections.length < minSections) {
    return { valid: false, error: `${prefix}.content.sections must have at least ${minSections} sections (received ${content.sections.length})` };
  }

  let codeCount = 0;
  let quizCount = 0;

  for (let j = 0; j < content.sections.length; j++) {
    const sec = content.sections[j];
    const secPrefix = `${prefix}.sections[${j}]`;

    if (!sec || typeof sec !== "object") {
      return { valid: false, error: `${secPrefix} must be a non-null object` };
    }

    const secObj = sec as Record<string, unknown>;

    if (!VALID_SECTION_TYPES.includes(secObj.type as string)) {
      return { valid: false, error: `${secPrefix}.type must be one of: ${VALID_SECTION_TYPES.join(", ")}` };
    }
    if (typeof secObj.title !== "string" || secObj.title.length === 0) {
      return { valid: false, error: `${secPrefix}.title is required` };
    }

    // Body minimum length: explanation requires threshold chars, non-explanation requires 20 chars
    const minBodyLength = secObj.type === "explanation"
      ? getMinExplanationChars(difficulty)
      : 20;
    if (typeof secObj.body !== "string" || (secObj.body as string).trim().length < minBodyLength) {
      return { valid: false, error: `${secPrefix}.body must be at least ${minBodyLength} characters (${secObj.type})` };
    }

    if (secObj.type === "code_example") {
      codeCount++;
      if (typeof secObj.code !== "string" || (secObj.code as string).trim().length === 0) {
        return { valid: false, error: `${secPrefix} code_example must have a non-empty code field` };
      }
    }

    if (secObj.type === "quiz_question") {
      quizCount++;
      if (!Array.isArray(secObj.quiz_options) || secObj.quiz_options.length !== 4) {
        return { valid: false, error: `${secPrefix}.quiz_options must have exactly 4 options` };
      }
      for (let k = 0; k < secObj.quiz_options.length; k++) {
        if (typeof secObj.quiz_options[k] !== "string" || (secObj.quiz_options[k] as string).trim().length === 0) {
          return { valid: false, error: `${secPrefix}.quiz_options[${k}] must be a non-empty string` };
        }
      }
      if (typeof secObj.quiz_answer !== "number" || secObj.quiz_answer < 0 || secObj.quiz_answer > 3) {
        return { valid: false, error: `${secPrefix}.quiz_answer must be 0-3` };
      }
      if (typeof secObj.quiz_explanation !== "string" || (secObj.quiz_explanation as string).trim().length < 20) {
        return { valid: false, error: `${secPrefix} quiz_explanation must be at least 20 characters` };
      }
    }

    if (secObj.type === "challenge") {
      if (typeof secObj.challenge_starter_code !== "string" || (secObj.challenge_starter_code as string).trim().length === 0) {
        return { valid: false, error: `${secPrefix} challenge must have challenge_starter_code` };
      }
      if (typeof secObj.challenge_answer_code !== "string" || (secObj.challenge_answer_code as string).trim().length === 0) {
        return { valid: false, error: `${secPrefix} challenge must have challenge_answer_code` };
      }
    }
  }

  const minCode = getMinCodeExamples(difficulty);
  if (codeCount < minCode) {
    return { valid: false, error: `${prefix} must have at least ${minCode} code_example section(s) (found ${codeCount})` };
  }

  const minQuiz = getMinQuizQuestions(difficulty);
  if (quizCount < minQuiz) {
    return { valid: false, error: `${prefix} must have at least ${minQuiz} quiz_question section(s) (found ${quizCount})` };
  }

  return { valid: true };
}

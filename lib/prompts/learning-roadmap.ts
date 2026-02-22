// ─── Phase 1: Structure Generation ────────────────────────────────────
// A single LLM call that produces module titles, ordering, types,
// relevant_files, and learning_objectives — but NO content bodies.

const STRUCTURE_JSON_SCHEMA = `{
  "title": "string (descriptive learning path title)",
  "description": "string (2-3 sentence overview of what the learner will achieve)",
  "difficulty": "beginner | intermediate | advanced",
  "estimated_hours": number,
  "modules": [
    {
      "title": "string (concise module title)",
      "description": "string (1-2 sentence module description)",
      "module_type": "concept | practical | quiz | project_walkthrough",
      "estimated_minutes": number (15-45),
      "tech_name": "string (exact technology name this module covers)",
      "relevant_files": ["string (file paths from the project that are relevant to this module)"],
      "learning_objectives": ["string (2-4 specific things the student will learn)"]
    }
  ]
}`;

// ─── Phase 2: Content Batch Generation ────────────────────────────────
// One LLM call per tech_name batch. Receives module stubs + relevant
// source code and produces fully personalized content sections.

const CONTENT_JSON_SCHEMA = `[
  {
    "module_title": "string (must match the module title from Phase 1)",
    "content": {
      "sections": [
        {
          "type": "explanation | code_example | quiz_question | challenge",
          "title": "string (section heading)",
          "body": "string (markdown content — reference the student's actual code)",
          "code": "string (code snippet, if applicable, otherwise omit)",
          "quiz_options": ["string array (if quiz_question, otherwise omit)"],
          "quiz_answer": number (0-based index of correct option, if quiz_question, otherwise omit)
        }
      ]
    }
  }
]`;

interface TechStackInput {
  technology_name: string;
  category: string;
  importance: string;
  version: string | null;
  description: string | null;
}

function buildTechListSection(techStacks: TechStackInput[]): string {
  return techStacks
    .map((t) => {
      const parts = [
        `- **${t.technology_name}**`,
        `(${t.category}, ${t.importance})`,
      ];
      if (t.version) parts.push(`v${t.version}`);
      if (t.description) parts.push(`— ${t.description}`);
      return parts.join(" ");
    })
    .join("\n");
}

function buildLevelGuidance(level: string): string {
  if (level === "beginner") {
    return `   - Start with absolute basics ("What is X and why does it exist?")
   - Use simple analogies and everyday language
   - Avoid jargon — when you must use a technical term, define it immediately
   - More concept and quiz modules, fewer practical modules`;
  }
  if (level === "intermediate") {
    return `   - Assume basic programming knowledge
   - Focus on "how" and "why" rather than "what"
   - Include more practical and project_walkthrough modules
   - Cover common patterns and best practices`;
  }
  return `   - Assume solid programming knowledge
   - Focus on advanced patterns, performance, and architecture
   - Heavy on practical and project_walkthrough modules
   - Cover edge cases, internals, and optimization strategies`;
}

/**
 * Phase 1 — Structure prompt.
 * Input: tech stacks + project digest.
 * Output: module titles/order/type + relevant_files + learning_objectives (no content).
 */
export function buildStructurePrompt(
  techStacks: TechStackInput[],
  projectDigest: string,
  userLevel?: "beginner" | "intermediate" | "advanced",
): string {
  const level = userLevel ?? "beginner";
  const techListSection = buildTechListSection(techStacks);

  return `You are an expert programming instructor creating a personalized learning roadmap structure for a "vibe coder."

A vibe coder is someone who built a working application using AI coding tools (like Claude Code, Cursor, Bolt, etc.) but wants to deeply understand the technologies they used. They can make things work but want to know WHY they work.

## Student Profile

- **Experience Level:** ${level}
- **Learning Style:** Hands-on, project-based. They already have a working project — they want to understand it.
- **Goal:** Understand their own project's tech stack so they can debug, extend, and improve it independently.

## Project's Technology Stack

${techListSection}

## Project Digest

${projectDigest}

## Instructions

Create the STRUCTURE of a learning roadmap (no content bodies yet). Follow these rules:

1. **Start with the most important technology** (core framework first, then languages, then supporting tools).
2. **Order by dependency** — prerequisites come before dependents (e.g., teach JavaScript basics before React, teach React before Next.js).
3. **Each technology gets 3-7 learning modules** depending on its complexity and importance.
4. **Each module should be 15-45 minutes** of focused learning time.
5. **Mix module types:**
   - \`concept\` — Explain a core concept with clear analogies and examples
   - \`practical\` — Hands-on coding exercise or walkthrough
   - \`quiz\` — Knowledge check with multiple choice questions
   - \`project_walkthrough\` — Walk through how this concept appears in their actual project
6. **For ${level} level:**
${buildLevelGuidance(level)}
7. **relevant_files** — List specific file paths from the project that are relevant to this module. Use actual paths from the project digest above.
8. **learning_objectives** — List 2-4 specific things the student will learn in this module.

## Important Rules

- Output ONLY valid JSON matching the schema below. No markdown code fences, no explanation, no preamble.
- The \`tech_name\` field MUST exactly match one of the technology names listed above.
- The \`estimated_hours\` should be the realistic total time to complete all modules.
- Do NOT include any \`content\` or \`sections\` fields — only structure.

## Output JSON Schema

${STRUCTURE_JSON_SCHEMA}`;
}

/**
 * Phase 2 — Content batch prompt.
 * Called once per tech_name group. Receives the module stubs for that tech
 * plus the actual source code of relevant files, and produces fully
 * personalized content sections.
 */
export function buildContentBatchPrompt(
  techName: string,
  modules: Array<{
    title: string;
    description: string;
    module_type: string;
    learning_objectives: string[];
  }>,
  relevantCode: Array<{ path: string; content: string }>,
  userLevel?: "beginner" | "intermediate" | "advanced",
): string {
  const level = userLevel ?? "beginner";

  const modulesSection = modules
    .map(
      (m) =>
        `### ${m.title}
- Type: ${m.module_type}
- Description: ${m.description}
- Learning objectives: ${m.learning_objectives.join("; ")}`,
    )
    .join("\n\n");

  const codeSection =
    relevantCode.length > 0
      ? relevantCode
          .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
          .join("\n\n")
      : "(no source files available)";

  return `You are an expert programming instructor creating personalized educational content for a "vibe coder" learning **${techName}**.

The student built a working application using AI coding tools and wants to deeply understand their own code. Your job is to generate module content that directly references their actual project files.

## Student Level: ${level}

## Modules to Generate Content For

${modulesSection}

## Student's Actual Source Code

${codeSection}

## Instructions

For each module listed above, generate detailed content sections. Follow these rules:

1. **Reference the student's actual code.** Say things like "In your \`middleware.ts\`, line 5 does..." or "Look at how your \`app/api/auth/route.ts\` handles...". Never invent code that doesn't exist in the files above.
2. **Content sections for each module:**
   - \`explanation\` — Clear markdown text explaining a concept, referencing the student's code
   - \`code_example\` — A code snippet FROM the student's project with line-by-line explanation (must include \`code\` field)
   - \`quiz_question\` — Multiple choice question based on the student's code (must include \`quiz_options\` and \`quiz_answer\` fields)
   - \`challenge\` — A small coding challenge related to the student's project
3. **Each module MUST have at least 2 sections.**
4. **Quiz questions** should have exactly 4 options with one correct answer (0-indexed).
5. **For ${level} level:**
${buildLevelGuidance(level)}

## Important Rules

- Output ONLY valid JSON matching the schema below. No markdown code fences, no explanation, no preamble.
- The \`module_title\` field MUST exactly match the module titles listed above.
- If no source code is available for a module, write general content but clearly note it's not project-specific.

## Output JSON Schema

${CONTENT_JSON_SCHEMA}`;
}

// ─── Legacy single-call prompt (kept for backwards compatibility) ─────

const ROADMAP_JSON_SCHEMA = `{
  "title": "string (descriptive learning path title)",
  "description": "string (2-3 sentence overview of what the learner will achieve)",
  "difficulty": "beginner | intermediate | advanced",
  "estimated_hours": number,
  "modules": [
    {
      "title": "string (concise module title)",
      "description": "string (1-2 sentence module description)",
      "module_type": "concept | practical | quiz | project_walkthrough",
      "estimated_minutes": number (15-45),
      "tech_name": "string (exact technology name this module covers)",
      "content": {
        "sections": [
          {
            "type": "explanation | code_example | quiz_question | challenge",
            "title": "string (section heading)",
            "body": "string (markdown content)",
            "code": "string (code snippet, if applicable, otherwise omit)",
            "quiz_options": ["string array (if quiz_question, otherwise omit)"],
            "quiz_answer": number (0-based index of correct option, if quiz_question, otherwise omit)
          }
        ]
      }
    }
  ]
}`;

export function buildRoadmapPrompt(
  techStacks: TechStackInput[],
  userLevel?: "beginner" | "intermediate" | "advanced",
): string {
  const level = userLevel ?? "beginner";
  const techListSection = buildTechListSection(techStacks);

  return `You are an expert programming instructor creating a personalized learning roadmap for a "vibe coder."

A vibe coder is someone who built a working application using AI coding tools (like Claude Code, Cursor, Bolt, etc.) but wants to deeply understand the technologies they used. They can make things work but want to know WHY they work.

## Student Profile

- **Experience Level:** ${level}
- **Learning Style:** Hands-on, project-based. They already have a working project — they want to understand it.
- **Goal:** Understand their own project's tech stack so they can debug, extend, and improve it independently.

## Project's Technology Stack

${techListSection}

## Instructions

Create a structured learning roadmap following these rules:

1. **Start with the most important technology** (core framework first, then languages, then supporting tools).
2. **Order by dependency** — prerequisites come before dependents (e.g., teach JavaScript basics before React, teach React before Next.js).
3. **Each technology gets 3-7 learning modules** depending on its complexity and importance.
4. **Each module should be 15-45 minutes** of focused learning time.
5. **Mix module types:**
   - \`concept\` — Explain a core concept with clear analogies and examples
   - \`practical\` — Hands-on coding exercise or walkthrough
   - \`quiz\` — Knowledge check with multiple choice questions
   - \`project_walkthrough\` — Walk through how this concept appears in their actual project
6. **For ${level} level:**
${buildLevelGuidance(level)}
7. **Content sections within each module:**
   - \`explanation\` — Clear markdown text explaining a concept
   - \`code_example\` — A code snippet with explanation (must include \`code\` field)
   - \`quiz_question\` — Multiple choice question (must include \`quiz_options\` and \`quiz_answer\` fields)
   - \`challenge\` — A small coding challenge for the student to try
8. **Write all content in the student's context** — Reference their actual tech stack, not abstract examples.

## Important Rules

- Output ONLY valid JSON matching the schema below. No markdown code fences, no explanation, no preamble.
- Each module MUST have at least 2 sections in its content.
- The \`tech_name\` field MUST exactly match one of the technology names listed above.
- The \`estimated_hours\` should be the realistic total time to complete all modules.
- Quiz questions should have exactly 4 options with one correct answer (0-indexed).

## Output JSON Schema

${ROADMAP_JSON_SCHEMA}`;
}

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

interface TechStackInput {
  technology_name: string;
  category: string;
  importance: string;
  version: string | null;
  description: string | null;
}

export function buildRoadmapPrompt(
  techStacks: TechStackInput[],
  userLevel?: "beginner" | "intermediate" | "advanced",
): string {
  const level = userLevel ?? "beginner";

  const techListSection = techStacks
    .map((t) => {
      const parts = [
        `- **${t.technology_name}**`,
        `(${t.category}, ${t.importance})`,
      ];
      if (t.version) {
        parts.push(`v${t.version}`);
      }
      if (t.description) {
        parts.push(`— ${t.description}`);
      }
      return parts.join(" ");
    })
    .join("\n");

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
${level === "beginner" ? `   - Start with absolute basics ("What is X and why does it exist?")
   - Use simple analogies and everyday language
   - Avoid jargon — when you must use a technical term, define it immediately
   - More concept and quiz modules, fewer practical modules` : level === "intermediate" ? `   - Assume basic programming knowledge
   - Focus on "how" and "why" rather than "what"
   - Include more practical and project_walkthrough modules
   - Cover common patterns and best practices` : `   - Assume solid programming knowledge
   - Focus on advanced patterns, performance, and architecture
   - Heavy on practical and project_walkthrough modules
   - Cover edge cases, internals, and optimization strategies`}
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

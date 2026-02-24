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
          "type": "explanation | code_example | quiz_question | challenge | reflection",
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

Write ALL output in Korean (한국어). Module titles, descriptions, and learning_objectives should all be in Korean.

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
9. **Organize modules by layer** — Help the student understand the frontend/backend boundary. For web apps, organize modules to cover: routing/pages (프론트엔드), API endpoints (백엔드), database access patterns (데이터베이스), authentication flow (인증), and shared utilities (공통 유틸리티).
10. **For \`project_walkthrough\` modules** — Ensure relevant_files contains the specific file(s) the walkthrough will cover. Each project_walkthrough module should focus on one file or one tightly related group of files.

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

Write ALL content in Korean (한국어). Module titles, descriptions, explanations, quiz questions, quiz options, and challenges should all be in Korean. Technical terms (e.g., "middleware", "API route") can stay in English but explanations must be in Korean.

For each module listed above, generate detailed content sections. Follow these rules:

1. **Reference the student's actual code with specific line numbers.** When explaining a concept, point to specific lines in the student's files. For example: "여러분의 \`middleware.ts\`를 보면, 5번째 줄에서 \`updateSession()\`을 호출하고 있어요. 이게 매 요청마다 세션을 갱신하는 역할이에요." Never invent code that doesn't exist in the files above.
2. **Content sections for each module:**
   - \`explanation\` — Clear markdown text explaining a concept, referencing the student's code with specific file paths and line numbers
   - \`code_example\` — An ACTUAL code snippet copied FROM the student's project files above (must include \`code\` field). Include the file path in the title (e.g., "app/api/auth/route.ts 살펴보기"). In the body, explain what each important line does with Korean comments.
   - \`quiz_question\` — Multiple choice question based on the student's actual code (must include \`quiz_options\` and \`quiz_answer\` fields). For example: "\`app/layout.tsx\`에서 \`<html lang='ko'>\`를 사용하는 이유는 무엇일까요?"
   - \`challenge\` — A small, concrete coding challenge the student can try on their own project. Be specific about which file to modify and what to add. For example: "\`app/api/v1/projects/route.ts\`에 새로운 쿼리 파라미터를 추가해서 프로젝트를 상태별로 필터링하는 기능을 만들어 보세요."
   - \`reflection\` — A short "생각해보기" prompt (1-3 sentences) asking the student to pause and think. No quiz_options needed. For example: "만약 이 미들웨어가 없다면 어떤 문제가 생길까요? 한번 상상해 보세요."
3. **Each module MUST have 5-8 sections.** Keep individual sections SHORT — explanations should be 1-3 short paragraphs max. Use bullet points over long paragraphs.
4. **Interleave interactive sections:** After every 1-2 explanation/code_example sections, insert a quiz_question or reflection section. Never have more than 2 explanation sections in a row.
5. **Micro-learning tone:** Use short sentences. Start sections with a question or hook ("왜 이렇게 할까요?", "이 코드를 보면..."). Prefer bullet points over prose. Each section should feel like a quick card, not a lecture.
6. **Quiz questions** should have exactly 4 options with one correct answer (0-indexed).
7. **For ${level} level:**
${buildLevelGuidance(level)}
8. **For \`project_walkthrough\` modules:** Walk through one of the student's actual files from top to bottom. Start with the imports (각 라이브러리가 무슨 역할인지), then the main logic (핵심 로직 설명), then the exports (다른 파일에서 어떻게 사용되는지). Explain how this file connects to the rest of the project. Use the actual code from the source files above — do NOT paraphrase or abbreviate.
9. **For \`code_example\` sections:** Use ACTUAL code snippets FROM the student's files, not invented examples. Include the file path and add Korean comments explaining what each important line does. For example:
   \`\`\`
   // app/api/auth/route.ts에서 가져온 코드
   const supabase = createClient()  // Supabase 클라이언트 생성
   const { data } = await supabase.auth.getUser()  // 현재 로그인한 사용자 정보 가져오기
   \`\`\`
10. **For \`challenge\` sections:** Give a small, concrete task the student can try on their own project. Specify the exact file to modify, what to add or change, and what the expected result should be. Make challenges relevant to the student's actual codebase.

## Important Rules

- Output ONLY valid JSON matching the schema below. No markdown code fences, no explanation, no preamble.
- The \`module_title\` field MUST exactly match the module titles listed above.
- If no source code is available for a module, write general content but clearly note it's not project-specific.
- Code in \`code\` fields must be copied from the student's actual files. Do NOT invent new code unless it's part of a challenge task.

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
            "type": "explanation | code_example | quiz_question | challenge | reflection",
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

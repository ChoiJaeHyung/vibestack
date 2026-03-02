import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";
import type { CurriculumContext, ConceptHintItem, EducationalAnalysisData, TechStackItem } from "../types.js";
import { scanTeachingCriticalFiles } from "../lib/file-scanner.js";

export const generateCurriculumSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("beginner")
    .describe("Target difficulty level for the curriculum"),
};

// ─── Formatting helpers ─────────────────────────────────────────────

function formatTechStack(t: TechStackItem): string {
  return `- **${t.name}**${t.version ? ` v${t.version}` : ""} (${t.category})`;
}

function formatKBHints(kbHints: Record<string, ConceptHintItem[]>, locale: "ko" | "en"): string {
  const sections: string[] = [];

  for (const [techName, hints] of Object.entries(kbHints)) {
    if (hints.length === 0) continue;

    const conceptLines = locale === "en"
      ? hints.map((h) =>
          `#### ${h.concept_name} (\`${h.concept_key}\`)
- **Key Points:**
${h.key_points.map((p) => `  - ${p}`).join("\n")}
- **Good Quiz Topics:** ${h.common_quiz_topics.join(", ")}
- **Prerequisites:** ${h.prerequisite_concepts.length > 0 ? h.prerequisite_concepts.join(", ") : "(none)"}`
        ).join("\n\n")
      : hints.map((h) =>
          `#### ${h.concept_name} (\`${h.concept_key}\`)
- **핵심 포인트:**
${h.key_points.map((p) => `  - ${p}`).join("\n")}
- **좋은 퀴즈 주제:** ${h.common_quiz_topics.join(", ")}
- **선행 개념:** ${h.prerequisite_concepts.length > 0 ? h.prerequisite_concepts.join(", ") : "(없음)"}`
        ).join("\n\n");

    const heading = locale === "en"
      ? `### ${techName} Core Concept Guide`
      : `### ${techName} 핵심 개념 가이드`;
    sections.push(`${heading}\n\n${conceptLines}`);
  }

  if (sections.length === 0) return "";

  const header = locale === "en"
    ? `## Educational Key Points (Knowledge Base)

Below are **core educational key points** for each technology.
Include these points in the curriculum, reference quiz topics, and follow prerequisite ordering.`
    : `## 교육 핵심 포인트 (Knowledge Base)

아래는 각 기술의 **핵심 교육 포인트**입니다.
커리큘럼에 반드시 이 포인트들을 포함하고, 퀴즈 주제를 참고하세요.
선행 개념 순서에 맞게 모듈을 배치하세요.`;

  return `${header}\n\n${sections.join("\n\n")}`;
}

function formatEducationalAnalysis(
  analysis: EducationalAnalysisData,
  difficulty: string,
  locale: "ko" | "en",
): string {
  const sections: string[] = [];
  const en = locale === "en";

  // Project Overview
  const ov = analysis.project_overview;
  sections.push(en
    ? `### Project Overview (AI Analysis)
- **App Description:** ${ov.one_liner}
- **App Type:** ${ov.app_type}
- **Target Users:** ${ov.target_users}
- **Core Features:** ${ov.core_features.join(", ")}`
    : `### 프로젝트 개요 (AI 분석 결과)
- **앱 설명:** ${ov.one_liner}
- **앱 유형:** ${ov.app_type}
- **대상 사용자:** ${ov.target_users}
- **핵심 기능:** ${ov.core_features.join(", ")}`);

  // User Flows
  if (analysis.user_flows.length > 0) {
    const flowLines = analysis.user_flows.map((f) => {
      const steps = f.steps
        .map((s) => `    - ${s.description} (\`${s.file}\`:${s.line_range})`)
        .join("\n");
      return en
        ? `- **${f.name}** (difficulty: ${f.difficulty})\n  Trigger: ${f.trigger}\n${steps}`
        : `- **${f.name}** (난이도: ${f.difficulty})\n  트리거: ${f.trigger}\n${steps}`;
    });
    sections.push(en
      ? `### User Flows\n\nEach flow should be covered in the curriculum:\n\n${flowLines.join("\n\n")}`
      : `### 사용자 흐름 (User Flows)\n\n각 흐름을 커리큘럼에서 다뤄야 합니다:\n\n${flowLines.join("\n\n")}`);
  }

  // File Difficulty Map
  if (analysis.file_analysis.length > 0) {
    const fileLines = analysis.file_analysis
      .sort((a, b) => a.complexity - b.complexity)
      .map((f) => en
        ? `- \`${f.path}\` — ${f.role} (complexity: ${f.complexity}/5, ${f.difficulty})`
        : `- \`${f.path}\` — ${f.role} (복잡도: ${f.complexity}/5, ${f.difficulty})`);
    sections.push(en
      ? `### File Difficulty Map\n\nSorted from easiest to hardest. Use this to determine module order:\n\n${fileLines.join("\n")}`
      : `### 파일 난이도 맵\n\n쉬운 파일부터 어려운 파일 순서로 정렬했습니다. 모듈 순서를 결정할 때 참고하세요:\n\n${fileLines.join("\n")}`);
  }

  // Learning Priorities
  const priorities = analysis.learning_priorities;
  const lp = difficulty === "beginner"
    ? priorities.beginner
    : difficulty === "intermediate"
      ? priorities.intermediate
      : priorities.advanced;

  const priorityLines = en
    ? [
        `- **Start with:** ${lp.start_with.join(", ")}`,
        `- **Focus on:** ${lp.focus_on.join(", ")}`,
      ]
    : [
        `- **시작:** ${lp.start_with.join(", ")}`,
        `- **집중:** ${lp.focus_on.join(", ")}`,
      ];
  if ("skip_for_now" in lp) {
    priorityLines.push(en
      ? `- **Skip for now:** ${(lp as typeof priorities.beginner).skip_for_now.join(", ")}`
      : `- **나중에:** ${(lp as typeof priorities.beginner).skip_for_now.join(", ")}`);
  }
  if ("deep_dive" in lp) {
    priorityLines.push(en
      ? `- **Deep dive:** ${(lp as typeof priorities.intermediate).deep_dive.join(", ")}`
      : `- **심화:** ${(lp as typeof priorities.intermediate).deep_dive.join(", ")}`);
  }
  if ("challenge_topics" in lp) {
    priorityLines.push(en
      ? `- **Challenge:** ${(lp as typeof priorities.advanced).challenge_topics.join(", ")}`
      : `- **도전:** ${(lp as typeof priorities.advanced).challenge_topics.join(", ")}`);
  }
  sections.push(en
    ? `### ${difficulty} Level Learning Priorities\n\n${priorityLines.join("\n")}`
    : `### ${difficulty} 난이도 학습 우선순위\n\n${priorityLines.join("\n")}`);

  // Repeated Patterns
  if (analysis.repeated_patterns.length > 0) {
    const patternLines = analysis.repeated_patterns.map((p) => en
      ? `- **${p.name}**: ${p.description} (found ${p.occurrences.length} times) — teaching value: ${p.teaching_value}`
      : `- **${p.name}**: ${p.description} (${p.occurrences.length}회 발견) — 교육 가치: ${p.teaching_value}`);
    sections.push(en
      ? `### Repeated Patterns\n\nThese patterns are used repeatedly in the project. Including them in the curriculum enhances learning:\n\n${patternLines.join("\n")}`
      : `### 반복 패턴\n\n프로젝트에서 반복적으로 사용되는 패턴입니다. 이 패턴들을 커리큘럼에 포함하면 학습 효과가 높아집니다:\n\n${patternLines.join("\n")}`);
  }

  // Code Quality
  const cq = analysis.code_quality;
  if (cq.good_practices.length > 0 || cq.improvement_areas.length > 0) {
    const lines: string[] = [];
    if (cq.good_practices.length > 0) {
      lines.push(en ? "**Good Practices (Teaching Points):**" : "**좋은 사례 (교육 포인트):**");
      for (const gp of cq.good_practices) {
        lines.push(en
          ? `- ${gp.description} → Related concept: ${gp.concept}`
          : `- ${gp.description} → 관련 개념: ${gp.concept}`);
      }
    }
    if (cq.improvement_areas.length > 0) {
      lines.push(en ? "\n**Improvement Opportunities (Learning Opportunities):**" : "\n**개선 기회 (학습 기회):**");
      for (const ia of cq.improvement_areas) {
        lines.push(en
          ? `- [${ia.severity}] ${ia.description} → Teaching: ${ia.teaching_opportunity}`
          : `- [${ia.severity}] ${ia.description} → 교육: ${ia.teaching_opportunity}`);
      }
    }
    sections.push(en
      ? `### Code Quality Observations\n\n${lines.join("\n")}`
      : `### 코드 품질 관찰\n\n${lines.join("\n")}`);
  }

  // Tech Stack Metaphors (beginner only)
  if (difficulty === "beginner" && ov.tech_stack_metaphors.length > 0) {
    const metaphorLines = ov.tech_stack_metaphors.map(
      (m) => `- **${m.tech_name}** → ${m.metaphor}`,
    );
    sections.push(en
      ? `### Tech Stack Metaphors (Beginner)\n\nUse these metaphors actively in the curriculum:\n\n${metaphorLines.join("\n")}`
      : `### 기술 스택 비유 (초보자용)\n\n이 비유들을 커리큘럼에서 적극 활용하세요:\n\n${metaphorLines.join("\n")}`);
  }

  const header = en
    ? `## Project Educational Analysis

Below is AI-analyzed educational metadata for the project.
Use this information to create a more specific and personalized curriculum.`
    : `## 프로젝트 교육 분석 (Educational Analysis)

아래는 AI가 프로젝트를 분석한 교육용 메타데이터입니다.
이 정보를 활용해 더 구체적이고 맞춤화된 커리큘럼을 만드세요.`;

  return `${header}\n\n${sections.join("\n\n")}`;
}

function buildLevelGuidance(difficulty: string, locale: "ko" | "en"): string {
  const en = locale === "en";
  if (difficulty === "beginner") {
    return en
      ? `**[Core Principle] Explain as if to a 5-6 year old. Assume they know nothing.**
   - 3-step concept breakdown: ①Analogy (food/LEGO/school/play) → ②One-sentence definition → ③Code connection
   - "What if this didn't exist?" before/after comparison required (e.g., "No middleware? → Anyone can access secret pages 😱")
   - Translate every line of code into plain English (e.g., \`const x = 5\` → "Put the number 5 in a box called x 📦")
   - Give friendly nicknames to technical terms: useState→"memory box", props→"delivery package", middleware→"security checkpoint"
   - concept 40%+, quiz 20%+, practical 15%↓(very easy only)
   - 50%+ analogy-based quizzes, challenges with only 1-2 blanks + very specific hints
   - explanation 400+ chars, 8-12 paragraphs, 7-12 sections per module
   - Use emojis actively: 🎯summary, 💡tip, ⚠️warning, 👏praise, 🎉celebration
   - Tone: like reading a picture book, short sentences, lots of encouragement
   - estimated_minutes: 25-45 min (detailed explanations)`
      : `**[대원칙] 5~6세 아이에게 설명하듯. 아무것도 모른다고 가정.**
   - 개념 3단계 쪼개기 필수: ①비유(음식/레고/학교/놀이) → ②한 문장 정의 → ③코드 연결
   - "이게 없으면?" before/after 비교 필수 (예: "미들웨어 없으면? → 아무나 비밀 페이지 접근 😱")
   - 코드 한 줄마다 "우리말 번역" (예: \`const x = 5\` → "x 상자에 숫자 5를 넣어요 📦")
   - 기술 용어에 한국어 별명: useState→"기억 상자", props→"택배 상자", middleware→"보안 검문소"
   - concept 40%↑, quiz 20%↑, practical 15%↓(아주 쉬운 것만)
   - quiz 50%+ 비유 기반, challenge 빈칸 1-2개만+매우 구체적 힌트
   - explanation 400자↑, 8-12문단, 모듈당 7-12섹션
   - 이모지 적극 활용: 🎯한줄정리, 💡팁, ⚠️주의, 👏칭찬, 🎉축하
   - 톤: 그림책 읽어주듯, 짧은 문장, 격려·칭찬 대폭
   - estimated_minutes: 25-45분 (상세한 설명)`;
  }
  if (difficulty === "intermediate") {
    return en
      ? `- Assume basic programming knowledge
   - Focus on "how" and "why" — not just usage but how things work and design decisions
   - Increase practical and project_walkthrough module ratio
   - Cover common patterns, best practices, common mistakes`
      : `- 기본 프로그래밍 지식은 안다고 가정
   - "어떻게"와 "왜"에 집중 — 단순 사용법이 아니라 동작 원리와 설계 이유
   - practical과 project_walkthrough 모듈 비중 높이기
   - 일반적인 패턴, 베스트 프랙티스, 흔한 실수 다루기`;
  }
  return en
    ? `- Assume solid programming knowledge
   - Focus on advanced patterns, performance optimization, architecture design
   - Maximize practical and project_walkthrough ratio
   - Cover edge cases, internals, optimization strategies`
    : `- 탄탄한 프로그래밍 지식 전제
   - 고급 패턴, 성능 최적화, 아키텍처 설계에 집중
   - practical과 project_walkthrough 비중 극대화
   - 엣지 케이스, 내부 동작 원리, 최적화 전략 다루기`;
}

// ─── Tool registration ──────────────────────────────────────────────

export function registerGenerateCurriculum(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_generate_curriculum",
    "Generate a learning curriculum for the project. IMPORTANT: Before calling this tool, you MUST ask the user which difficulty level they prefer — beginner (초급), intermediate (중급), or advanced (고급). Do NOT default to beginner without asking. Returns tech stack info and a JSON schema — you create the curriculum JSON, then submit it with vibeuniv_submit_curriculum.",
    generateCurriculumSchema,
    { readOnlyHint: true, openWorldHint: true },
    async ({ project_id, difficulty }) => {
      try {
        console.error(`[vibeuniv] Generating curriculum instructions for project ${project_id}...`);

        // Fetch all curriculum context in a single API call
        const curriculumContext: CurriculumContext = await client.getCurriculumContext(project_id);

        // Read teaching-critical files from local disk (avoids server roundtrip for file decryption)
        let localFiles: Array<{ file_path: string; content: string }> = [];
        try {
          localFiles = await scanTeachingCriticalFiles(process.cwd());
        } catch (err) {
          console.error(`[vibeuniv] Local file scan failed (non-fatal): ${err instanceof Error ? err.message : err}`);
        }

        // Prefer local files; fall back to server files if local scan yields nothing
        const curriculumFiles = localFiles.length > 0
          ? localFiles
          : (curriculumContext.files ?? []);

        const techStacks = curriculumContext.techStacks;
        const locale = curriculumContext.locale ?? "ko";
        const en = locale === "en";

        if (techStacks.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No tech stacks found for project ${project_id}. Run vibeuniv_analyze first to analyze the project.`,
              },
            ],
            isError: true,
          };
        }

        const kbResult = Object.keys(curriculumContext.knowledgeHints).length > 0
          ? { techs: curriculumContext.knowledgeHints }
          : null;
        const educationalAnalysis = curriculumContext.educationalAnalysis;

        // Separate core vs supporting stacks for priority guidance
        const coreStacks = techStacks.filter((t) => t.importance === "core");
        const supportingStacks = techStacks.filter((t) => t.importance !== "core");

        const coreList = coreStacks.map(formatTechStack).join("\n");
        const supportingList = supportingStacks.length > 0
          ? supportingStacks.map(formatTechStack).join("\n")
          : en ? "(none)" : "(없음)";

        const levelGuidance = buildLevelGuidance(difficulty, locale);

        // Build KB hints section
        const kbSection = kbResult && Object.keys(kbResult.techs).length > 0
          ? `\n${formatKBHints(kbResult.techs, locale)}\n`
          : "";

        // Build educational analysis section (with defensive try/catch for LLM-generated data)
        let eduSection = "";
        let hasEduAnalysis = false;
        if (educationalAnalysis) {
          try {
            eduSection = `\n${formatEducationalAnalysis(educationalAnalysis, difficulty, locale)}\n`;
            hasEduAnalysis = true;
          } catch (err) {
            console.error(`[vibeuniv] Educational analysis formatting failed (non-fatal): ${err instanceof Error ? err.message : err}`);
          }
        }

        // Build educational analysis instruction
        const eduInstruction = hasEduAnalysis
          ? en
            ? `\n**Educational Analysis Usage:** Project overview→intro, User Flows→walkthrough, File difficulty→module order, Learning priorities→arrangement, Repeated patterns→quizzes, Code quality→teaching points${difficulty === "beginner" ? ", Metaphors→explanations" : ""}`
            : `\n**교육 분석 활용:** 프로젝트 개요→소개, User Flows→walkthrough, 파일 난이도→모듈 순서, 학습 우선순위→배치, 반복 패턴→퀴즈, 코드 품질→교육 포인트${difficulty === "beginner" ? ", 비유→explanation" : ""}`
          : "";

        // Build KB instruction
        const kbInstruction = kbResult && Object.keys(kbResult.techs).length > 0
          ? en
            ? `\n**KB Usage:** Include key points, use quiz topics, follow prerequisite ordering.`
            : `\n**KB 활용:** 핵심 포인트 필수 포함, 퀴즈 주제 활용, 선행 개념 순서 준수.`
          : "";

        // Build project source code section (local files preferred, server fallback)
        const filesSection = curriculumFiles.length > 0
          ? en
            ? `\n## Project Source Code

Below are the student's actual project files.
You MUST directly quote this code in code_example and walkthrough sections.
Do NOT make up code.

${curriculumFiles.map((f) => `#### ${f.file_path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")}\n`
            : `\n## 프로젝트 소스 코드

아래는 학생의 실제 프로젝트 파일입니다.
커리큘럼의 code_example, walkthrough 섹션에서 반드시 이 코드를 직접 인용하세요.
코드를 창작하지 마세요.

${curriculumFiles.map((f) => `#### ${f.file_path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")}\n`
          : "";

        const learnMoreLabel = en ? "📚 Learn More" : "📚 더 알아보기";
        const minBodyChars = difficulty === "beginner" ? "400" : "200";
        const sectionsPerModule = difficulty === "beginner" ? "7-12" : "5-8";
        const minSections = difficulty === "beginner" ? "5" : "3";
        const paragraphs = difficulty === "beginner" ? "8-12" : "5-8";

        const instructions = en
          ? `Please generate a learning curriculum for this project.

## Target: Vibe Coder (${difficulty})

Someone who built an app using AI coding tools but wants to understand **why it works**. Project-based learning, no abstract theory.

## Tech Stack

**Core (Required):**
${coreList}

**Supporting (Optional):**
${supportingList}
${filesSection}${eduSection}${kbSection}
## Design Principles

**Module Count (Required — server will reject if below minimum):**
- Minimum 15 modules total
- Core technologies: at least 3 modules each
- Supporting technologies: at least 1 module each

**Module Design — Focus on project features:**
Design modules around the project's actual features/files, not generic tech modules ("React Basics").

Good examples:
- "Dashboard Layout Analysis — Authentication with Server Components" (app/(dashboard)/layout.tsx)
- "API Routes and Middleware — Auth Checks and Rate Limiting" (middleware.ts, app/api/...)
- "Supabase Connection — Server vs Browser Client Differences" (lib/supabase/server.ts, client.ts)

Bad examples:
- "React Basics" (too generic)
- "TypeScript Introduction" (unrelated to project)

**Module Order:** Start from project entry points (page.tsx, layout.tsx) → core features → advanced patterns
**Each module must center around at least one project file**

**Module Types:** concept (concept+analogy), practical (code practice), quiz (code-based quiz), project_walkthrough (line-by-line file reading)
**Difficulty:**
${levelGuidance}

**Section Design (${sectionsPerModule} per module, minimum ${minSections}):**
- explanation: Markdown ${paragraphs} paragraphs. Must cite project file paths.
  End with "${learnMoreLabel}" links 2-3 (React→react.dev, Next.js→nextjs.org/docs,
  TypeScript→typescriptlang.org, Supabase→supabase.com/docs, Tailwind→tailwindcss.com/docs)
- code_example: Copy actual project code + line-by-line comments.
  Below the code block, explain with numbered list "What this code does:"
- quiz_question: 4-choice based on project code. quiz_explanation with correct/incorrect reasoning
- challenge: ___BLANK___ fill-in-the-blank. Both starter_code and answer_code required
- reflection: "Open the X folder in your project. Look for Y." format

**Required Placement Rules:**
- Start each module with explanation
- Maximum 2 consecutive explanations, 3rd must be quiz/reflection
- At least 1 code_example per module required
- At least 1 quiz_question per module required

**Tone (Critical — key to learning content quality):**
- Use casual, friendly "you" language
- Address the student as "you" or "we"
- Short sentences, one idea per sentence
- Keep technical terms in English + follow with a plain explanation in parentheses
- Start with questions: "Have you ever wondered about this code?", "Why does it work this way?"
- Encourage: "If you've followed along this far, you already understand half of it!", "It can be confusing at first — don't worry"
- Use analogies: everyday analogies for new concepts (API→restaurant order window, component→LEGO blocks)
- Transition phrases: "Alright, now let's...", "Wait a moment!", "Let's check the actual code, shall we?"
- Forbidden: dry academic tone, filler phrases like "Great question!", emotionless listing
- Do NOT make up code — only quote actual project code

**walkthrough:** Explain a file from import→logic→export order + connections to other files.
${eduInstruction}${kbInstruction}

## JSON Schema

Follow the structure below exactly. All string values in English. Output ONLY JSON (no code fences/explanations).

{
  "title": "string (required) — Curriculum title",
  "description": "string (required) — Curriculum description",
  "difficulty": "${difficulty}",
  "estimated_hours": number (optional),
  "modules": [
    {
      "title": "string (required) — Module title",
      "description": "string (required) — Module description",
      "module_type": "concept | practical | quiz | project_walkthrough",
      "estimated_minutes": number (15-45),
      "tech_name": "string (required) — Must exactly match a name from the tech stack list above",
      "content": {
        "sections": [
          {
            "type": "explanation | code_example | quiz_question | challenge | reflection",
            "title": "string (required) — Section title",
            "body": "string (required) — Markdown body. explanation minimum ${minBodyChars} chars",

            "code": "string (required for code_example) — Actual project code + line-by-line comments",

            "quiz_options": ["string", "string", "string", "string"] (required for quiz_question, exactly 4),
            "quiz_answer": number (required for quiz_question, 0-3),
            "quiz_explanation": "string (required for quiz_question) — Correct/incorrect reasoning",

            "challenge_starter_code": "string (required for challenge) — Contains ___BLANK___",
            "challenge_answer_code": "string (required for challenge) — Completed code"
          }
        ]
      }
    }
  ]
}

**Required Rules:**
- At least 1 code_example + 1 quiz_question per module
- Minimum 15 modules, minimum 3 sections per module
- explanation body must be at least ${minBodyChars} characters${difficulty === "beginner" ? `

**[Beginner-only Additional Rules — Must Follow]:**
- Every concept must have "What if this didn't exist?" before/after comparison
- Every line of code in code_example must have a plain-English translation
- 50%+ of quizzes must be analogy-based
- Insert a reflection after every 2 explanations
- Challenges must have only 1-2 blanks with very specific hints
- All technical terms must have friendly nicknames` : ""}

After generating: vibeuniv_submit_curriculum({ project_id: "${project_id}", curriculum: <JSON> })`
          : `이 프로젝트의 학습 커리큘럼을 생성해주세요.

## 대상: 바이브 코더 (${difficulty})

AI 코딩 도구로 앱을 만들었지만 **왜 작동하는지** 이해하고 싶은 사람. 프로젝트 기반 학습, 추상적 이론 X.

## 기술 스택

**Core (필수):**
${coreList}

**Supporting (선택):**
${supportingList}
${filesSection}${eduSection}${kbSection}
## 설계 원칙

**모듈 수량 (필수 — 미달 시 서버에서 거부됨):**
- 전체 최소 15개 모듈
- Core 기술: 각 최소 3개 모듈
- Supporting 기술: 각 최소 1개 모듈

**모듈 구성 — 프로젝트 기능 중심으로 설계:**
기술별 일반 모듈("React 기초")이 아닌, 프로젝트의 실제 기능/파일을 중심으로 설계하세요.

좋은 예:
- "대시보드 레이아웃 분석 — Server Component로 인증 처리하기" (app/(dashboard)/layout.tsx)
- "API 라우트와 미들웨어 — 인증 체크와 속도 제한" (middleware.ts, app/api/...)
- "Supabase 연결 — 서버 vs 브라우저 클라이언트 차이" (lib/supabase/server.ts, client.ts)

나쁜 예:
- "React 기초" (너무 일반적)
- "TypeScript 입문" (프로젝트와 무관)

**모듈 순서:** 프로젝트의 진입점(page.tsx, layout.tsx)부터 → 핵심 기능 → 고급 패턴
**각 모듈은 반드시 1개 이상의 프로젝트 파일을 중심으로 설명**

**모듈 유형:** concept(개념+비유), practical(코드 실습), quiz(코드 기반 퀴즈), project_walkthrough(파일 라인별 읽기)
**난이도:**
${levelGuidance}

**섹션 구성 (모듈당 ${sectionsPerModule}개, 최소 ${minSections}개):**
- explanation: 마크다운 ${paragraphs} 문단. 반드시 프로젝트 파일 경로 인용.
  끝에 "${learnMoreLabel}" 링크 2-3개 (React→react.dev, Next.js→nextjs.org/docs,
  TypeScript→typescriptlang.org, Supabase→supabase.com/docs, Tailwind→tailwindcss.com/docs)
- code_example: 프로젝트 실제 코드 복사 + 라인별 한국어 주석.
  코드 블록 아래에 "이 코드가 하는 일:" 번호 목록으로 설명
- quiz_question: 프로젝트 코드 기반 4지선다. quiz_explanation에 정답/오답 이유
- challenge: ___BLANK___ 빈칸 채우기. starter_code + answer_code 모두 필수
- reflection: "여러분의 프로젝트에서 X 폴더를 열어보세요. Y를 찾아보세요." 형태

**필수 배치 규칙:**
- 모듈 시작은 explanation으로
- explanation 연속 2개까지만, 3번째는 반드시 quiz/reflection
- 모듈당 code_example 최소 1개 필수
- 모듈당 quiz_question 최소 1개 필수

**톤 (매우 중요 — 학습 콘텐츠 품질의 핵심):**
- 해요체 사용 (~이에요, ~거든요, ~잖아요, ~해볼까요?)
- 학생을 "여러분" 또는 "우리"로 지칭
- 짧은 문장 위주, 한 문장에 하나의 아이디어
- 기술 용어는 영어 유지 + 바로 뒤에 괄호로 쉬운 설명
- 질문으로 시작: "혹시 이 코드 보면서 궁금하셨죠?", "왜 이렇게 할까요?"
- 격려 필수: "여기까지 따라오셨으면 벌써 절반은 이해하신 거예요!", "처음엔 헷갈릴 수 있는데 걱정 마세요"
- 비유 필수: 새 개념마다 일상생활 비유 (API→식당 주문 창구, 컴포넌트→레고 블록)
- 전환 어구: "자, 그러면 이제...", "여기서 잠깐!", "실제 코드에서 확인해볼까요?"
- 금지: 교과서체(~이다, ~하라), 감정 없는 나열, 영어 직역투
- 코드 창작 금지 — 프로젝트 실제 코드만 인용

**walkthrough:** 파일 하나를 import→로직→export 순서로 설명 + 다른 파일과의 연결.
${eduInstruction}${kbInstruction}

## JSON 스키마

아래 구조를 정확히 따르세요. 모든 string 값은 한국어. JSON만 출력 (코드 펜스/설명 없이).

{
  "title": "string (필수) — 커리큘럼 제목",
  "description": "string (필수) — 커리큘럼 설명",
  "difficulty": "${difficulty}",
  "estimated_hours": number (선택),
  "modules": [
    {
      "title": "string (필수) — 모듈 제목",
      "description": "string (필수) — 모듈 설명",
      "module_type": "concept | practical | quiz | project_walkthrough",
      "estimated_minutes": number (15-45),
      "tech_name": "string (필수) — 위 기술 스택 목록의 이름과 정확히 일치",
      "content": {
        "sections": [
          {
            "type": "explanation | code_example | quiz_question | challenge | reflection",
            "title": "string (필수) — 섹션 제목",
            "body": "string (필수) — 마크다운 본문. explanation은 최소 ${minBodyChars}자",

            "code": "string (code_example일 때 필수) — 프로젝트 실제 코드 + 라인별 주석",

            "quiz_options": ["string", "string", "string", "string"] (quiz_question일 때 필수, 정확히 4개),
            "quiz_answer": number (quiz_question일 때 필수, 0-3),
            "quiz_explanation": "string (quiz_question일 때 필수) — 정답/오답 이유",

            "challenge_starter_code": "string (challenge일 때 필수) — ___BLANK___ 포함",
            "challenge_answer_code": "string (challenge일 때 필수) — 완성 코드"
          }
        ]
      }
    }
  ]
}

**필수 규칙:**
- 모듈당 code_example 최소 1개 + quiz_question 최소 1개
- 최소 15개 모듈, 모듈당 최소 3개 섹션
- explanation body는 ${minBodyChars}자 이상${difficulty === "beginner" ? `

**[초급 전용 추가 규칙 — 반드시 준수]:**
- 모든 개념에 "이게 없으면?" before/after 비교 필수
- code_example 모든 코드 라인에 "우리말 번역" 필수
- quiz 50%+ 비유 기반 문제
- explanation 2개마다 reflection 1개 삽입
- challenge 빈칸 1-2개만, 힌트 매우 구체적
- 기술 용어에 한국어 별명 필수` : ""}

생성 후: vibeuniv_submit_curriculum({ project_id: "${project_id}", curriculum: <JSON> })`;

        return {
          content: [
            {
              type: "text" as const,
              text: instructions,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to generate curriculum instructions: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

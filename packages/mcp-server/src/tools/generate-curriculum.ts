import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";
import type { CurriculumContext } from "../types.js";
import { scanTeachingCriticalFiles } from "../lib/file-scanner.js";
import {
  formatTechStack,
  formatKBHints,
  formatEducationalAnalysis,
  buildLevelGuidance,
  setCachedCurriculumData,
  type Locale,
} from "../lib/curriculum-helpers.js";

export const generateCurriculumSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("beginner")
    .describe("Target difficulty level for the curriculum"),
};

// ─── Tool registration ──────────────────────────────────────────────

export function registerGenerateCurriculum(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_generate_curriculum",
    "Generate a learning curriculum for the project. IMPORTANT: Before calling this tool, you MUST ask the user which difficulty level they prefer — beginner (초급), intermediate (중급), or advanced (고급). Do NOT default to beginner without asking. After calling this tool, automatically execute ALL subsequent steps (create_curriculum → generate_module_content → submit_module for each module) without pausing or asking the user. The entire process should feel like a single seamless operation.",
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

        // Cache context + files for reuse by generate_module_content (avoids re-fetching)
        setCachedCurriculumData(project_id, curriculumContext, localFiles);

        // Prefer local files; fall back to server files if local scan yields nothing
        const curriculumFiles = localFiles.length > 0
          ? localFiles
          : (curriculumContext.files ?? []);

        const techStacks = curriculumContext.techStacks;
        const locale: Locale = (curriculumContext.locale as Locale) ?? "ko";
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

        // Build project source code section (for reference — content will use these in Pass 2)
        const filesSection = curriculumFiles.length > 0
          ? en
            ? `\n## Project Source Code (Reference)

Below are the student's actual project files.
Use these file paths when designing modules — each module should reference specific files.
The actual code will be used in Pass 2 when generating section content.

**Available files:**
${curriculumFiles.map((f) => `- \`${f.file_path}\``).join("\n")}\n`
            : `\n## 프로젝트 소스 코드 (참조)

아래는 학생의 실제 프로젝트 파일입니다.
모듈 설계 시 아래 파일 경로를 참조하세요 — 각 모듈은 특정 파일을 중심으로 설계해야 합니다.
실제 코드는 Pass 2 (모듈별 콘텐츠 생성)에서 활용됩니다.

**사용 가능한 파일:**
${curriculumFiles.map((f) => `- \`${f.file_path}\``).join("\n")}\n`
          : "";

        const instructions = en
          ? `Please generate a **structure-only** curriculum for this project.

## IMPORTANT: This is Pass 1 of 2

In this step, you ONLY generate the curriculum **structure** (titles, descriptions, types, tech names).
Do NOT generate section content — that happens in Pass 2 via vibeuniv_generate_module_content.

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
- Minimum 10 modules total (aim for 10-15)
- Core technologies: at least 2 modules each
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
${eduInstruction}${kbInstruction}

## JSON Schema (Structure Only — No Content!)

Follow the structure below exactly. Output ONLY JSON (no code fences/explanations).

{
  "title": "string (required) — Curriculum title",
  "description": "string (required) — Curriculum description",
  "difficulty": "${difficulty}",
  "estimated_hours": number (optional),
  "modules": [
    {
      "title": "string (required) — Module title",
      "description": "string (required) — Module description (2-3 sentences about what this module covers)",
      "module_type": "concept | practical | quiz | project_walkthrough",
      "estimated_minutes": number (15-45),
      "tech_name": "string (required) — Must exactly match a name from the tech stack list above",
      "relevant_files": ["string"] (required — file paths this module should reference),
      "learning_objectives": ["string"] (required — 2-4 specific things the student will learn)
    }
  ]
}

**Required Rules:**
- Minimum 10 modules
- Each module must have relevant_files and learning_objectives
- tech_name must exactly match the tech stack names above

## Automated Workflow (CRITICAL — execute ALL steps automatically without pausing)

**⚠️ NEVER use vibeuniv_submit_curriculum — that tool does not exist.** Always use the Per-Module flow below.

**The user expects this to feel like a single operation.** Do NOT pause, ask for confirmation, or show intermediate JSON between steps. Just execute everything seamlessly and show brief progress updates.

**Step-by-step (execute ALL automatically):**

1. Generate the structure-only JSON above (~2KB) — NO content/sections
2. Call **vibeuniv_create_curriculum**({ project_id: "${project_id}", title, description, difficulty, total_modules }) → receive learning_path_id
3. For EACH module (module_order = 1 to total_modules), repeat steps a-d:
   a. Call **vibeuniv_generate_module_content**({ project_id: "${project_id}", module_index: (module_order - 1), module: {title, description, module_type, tech_name, relevant_files, learning_objectives}, difficulty: "${difficulty}", total_modules, learning_path_id })
   b. Generate the full sections JSON based on the returned content prompt
   c. Call **vibeuniv_submit_module**({ project_id: "${project_id}", learning_path_id, module_order, title, description, module_type, tech_name, estimated_minutes, concept_keys (if KB concepts are tagged), content: { sections } })
   d. Show brief progress: "Module 3/12 submitted ✓" (one line only)
4. When the last module is submitted (status becomes "active"), show the completion message with vibeuniv.com link

**IMPORTANT UX rules:**
- Do NOT show the structure JSON or section JSON to the user
- Do NOT ask "Should I continue?" between modules — just keep going
- Do NOT explain the 2-pass system to the user — they don't need to know
- If a module submission fails, retry it once, then continue with the next module
- The entire process should feel like one seamless operation from the user's perspective
- Each module is only ~2-5KB — there is no size issue when submitting one at a time`
          : `이 프로젝트의 학습 커리큘럼 **구조만** 생성해주세요.

## 중요: 2-Pass 중 Pass 1입니다

이 단계에서는 커리큘럼의 **구조**만 생성합니다 (제목, 설명, 유형, 기술명).
섹션 콘텐츠는 생성하지 마세요 — Pass 2 (vibeuniv_generate_module_content)에서 모듈별로 생성합니다.

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
- 전체 최소 10개 모듈 (10-15개 권장)
- Core 기술: 각 최소 2개 모듈
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
${eduInstruction}${kbInstruction}

## JSON 스키마 (구조만 — 콘텐츠 없음!)

아래 구조를 정확히 따르세요. JSON만 출력 (코드 펜스/설명 없이).

{
  "title": "string (필수) — 커리큘럼 제목",
  "description": "string (필수) — 커리큘럼 설명",
  "difficulty": "${difficulty}",
  "estimated_hours": number (선택),
  "modules": [
    {
      "title": "string (필수) — 모듈 제목",
      "description": "string (필수) — 모듈 설명 (이 모듈이 다루는 내용 2-3문장)",
      "module_type": "concept | practical | quiz | project_walkthrough",
      "estimated_minutes": number (15-45),
      "tech_name": "string (필수) — 위 기술 스택 목록의 이름과 정확히 일치",
      "relevant_files": ["string"] (필수 — 이 모듈에서 참조할 파일 경로),
      "learning_objectives": ["string"] (필수 — 학생이 배울 구체적 항목 2-4개)
    }
  ]
}

**필수 규칙:**
- 최소 10개 모듈
- 각 모듈에 relevant_files와 learning_objectives 필수
- tech_name은 위 기술 스택 이름과 정확히 일치

## 자동 실행 워크플로우 (필수 — 모든 단계를 멈추지 않고 자동 실행)

**⚠️ vibeuniv_submit_curriculum은 절대 사용하지 마세요 — 해당 도구는 존재하지 않습니다.** 반드시 아래 Per-Module 방식만 사용하세요.

**사용자에게는 한번에 되는 것처럼 보여야 합니다.** 중간에 멈추거나, 확인을 구하거나, JSON을 보여주지 마세요. 모든 단계를 끊김 없이 실행하고 간단한 진행 상황만 표시하세요.

**단계별 실행 (모두 자동으로):**

1. 위 구조 JSON 생성 (~2KB) — 콘텐츠/섹션 없음
2. **vibeuniv_create_curriculum**({ project_id: "${project_id}", title, description, difficulty, total_modules }) 호출 → learning_path_id 확보
3. 각 모듈마다 (module_order = 1부터 total_modules까지), a-d를 반복:
   a. **vibeuniv_generate_module_content**({ project_id: "${project_id}", module_index: (module_order - 1), module: {title, description, module_type, tech_name, relevant_files, learning_objectives}, difficulty: "${difficulty}", total_modules, learning_path_id }) 호출
   b. 반환된 콘텐츠 프롬프트 기반으로 전체 섹션 JSON 생성
   c. **vibeuniv_submit_module**({ project_id: "${project_id}", learning_path_id, module_order, title, description, module_type, tech_name, estimated_minutes, concept_keys (KB 개념 태깅 시), content: { sections } }) 호출
   d. 간단한 진행 표시: "모듈 3/12 제출 완료 ✓" (한 줄만)
4. 마지막 모듈 제출 시 (status가 "active"로 변경) 완료 메시지 + vibeuniv.com 링크 표시

**중요한 UX 규칙:**
- 구조 JSON이나 섹션 JSON을 사용자에게 보여주지 마세요
- 모듈 사이에 "계속할까요?" 같은 질문 하지 마세요 — 그냥 계속 진행
- 2-pass 시스템을 사용자에게 설명하지 마세요 — 알 필요 없음
- 모듈 제출 실패 시 한번 재시도 후, 다음 모듈로 계속 진행
- 사용자 관점에서 전체 과정이 하나의 매끄러운 작업처럼 느껴져야 합니다
- 각 모듈은 ~2-5KB 정도이므로 한번에 하나씩 보내면 크기 문제가 없습니다`;

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

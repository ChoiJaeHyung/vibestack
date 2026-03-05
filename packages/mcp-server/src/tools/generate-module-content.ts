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
  filterKBHintsForModule,
  getCachedCurriculumData,
  setCachedCurriculumData,
  type Locale,
} from "../lib/curriculum-helpers.js";

export const generateModuleContentSchema = {
  project_id: z.string().describe("The VibeUniv project ID"),
  module_index: z.number().int().min(0).describe("0-based module index"),
  module: z
    .object({
      title: z.string(),
      description: z.string(),
      module_type: z.string(),
      tech_name: z.string(),
      estimated_minutes: z.number().optional(),
      relevant_files: z.array(z.string()).optional(),
      learning_objectives: z.array(z.string()).optional(),
    })
    .describe("Module structure object from vibeuniv_generate_curriculum"),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("beginner")
    .describe("Curriculum difficulty level"),
  total_modules: z.number().int().min(1).describe("Total number of modules in the curriculum"),
  learning_path_id: z.string().optional().describe("Learning path ID from vibeuniv_create_curriculum (for submit guidance)"),
};

export function registerGenerateModuleContent(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_generate_module_content",
    "Pass 2 of 2: Generate content sections for a single module. Call this once per module after vibeuniv_generate_curriculum returns the module structure. Returns section-generation instructions for one module. After generating sections, immediately submit with vibeuniv_submit_module.",
    generateModuleContentSchema,
    { readOnlyHint: true, openWorldHint: true },
    async ({ project_id, module_index, module, difficulty, total_modules, learning_path_id }) => {
      try {
        console.error(`[vibeuniv] Generating content for module ${module_index + 1}/${total_modules}: "${module.title}"...`);

        // Try cached data first, fetch fresh if miss
        let curriculumContext: CurriculumContext;
        let localFiles: Array<{ file_path: string; content: string }> = [];

        const cached = getCachedCurriculumData(project_id);
        if (cached) {
          console.error(`[vibeuniv] Using cached curriculum context for project ${project_id}`);
          curriculumContext = cached.context;
          localFiles = cached.localFiles;
        } else {
          console.error(`[vibeuniv] Cache miss — fetching fresh curriculum context for project ${project_id}`);
          curriculumContext = await client.getCurriculumContext(project_id);
          try {
            localFiles = await scanTeachingCriticalFiles(process.cwd());
          } catch (err) {
            console.error(`[vibeuniv] Local file scan failed (non-fatal): ${err instanceof Error ? err.message : err}`);
          }
          setCachedCurriculumData(project_id, curriculumContext, localFiles);
        }

        const techStacks = curriculumContext.techStacks;
        const locale: Locale = (curriculumContext.locale as Locale) ?? "ko";
        const en = locale === "en";

        // Filter KB hints for this module's tech (+ prerequisites)
        const filteredHints = filterKBHintsForModule(curriculumContext.knowledgeHints, module.tech_name);
        const kbSection = Object.keys(filteredHints).length > 0
          ? `\n${formatKBHints(filteredHints, locale)}\n`
          : "";

        // Educational analysis
        let eduSection = "";
        if (curriculumContext.educationalAnalysis) {
          try {
            eduSection = `\n${formatEducationalAnalysis(curriculumContext.educationalAnalysis, difficulty, locale)}\n`;
          } catch (err) {
            console.error(`[vibeuniv] Educational analysis formatting failed (non-fatal): ${err instanceof Error ? err.message : err}`);
          }
        }

        // Source code — filter to relevant files if available, otherwise include all
        const allFiles = localFiles.length > 0 ? localFiles : (curriculumContext.files ?? []);
        let curriculumFiles = allFiles;
        if (module.relevant_files && module.relevant_files.length > 0) {
          const relevantPaths = new Set(module.relevant_files.map((f) => f.toLowerCase()));
          const matched = allFiles.filter((f) =>
            relevantPaths.has(f.file_path.toLowerCase()) ||
            module.relevant_files!.some((rf) => f.file_path.toLowerCase().includes(rf.toLowerCase())),
          );
          // Use matched files if found, otherwise fall back to all files
          if (matched.length > 0) {
            curriculumFiles = matched;
          }
        }

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

        // Tech stack listing
        const coreStacks = techStacks.filter((t) => t.importance === "core");
        const supportingStacks = techStacks.filter((t) => t.importance !== "core");
        const coreList = coreStacks.map(formatTechStack).join("\n");
        const supportingList = supportingStacks.length > 0
          ? supportingStacks.map(formatTechStack).join("\n")
          : en ? "(none)" : "(없음)";

        const levelGuidance = buildLevelGuidance(difficulty, locale);

        const learnMoreLabel = en ? "📚 Learn More" : "📚 더 알아보기";
        const minBodyChars = difficulty === "beginner" ? "800" : "400";
        const sectionsPerModule = difficulty === "beginner" ? "7-10" : "5-7";
        const minSections = difficulty === "beginner" ? "7" : "5";
        const paragraphs = difficulty === "beginner" ? "8-12" : "5-8";
        const minCodeExamples = difficulty === "beginner" ? "2" : "1";
        const minQuizQuestions = difficulty === "beginner" ? "2" : "1";

        // Learning objectives guidance
        const objectivesSection = module.learning_objectives && module.learning_objectives.length > 0
          ? en
            ? `\n**Learning Objectives (must be covered in sections):**\n${module.learning_objectives.map((o) => `- ${o}`).join("\n")}\n`
            : `\n**학습 목표 (섹션에서 반드시 다뤄야 함):**\n${module.learning_objectives.map((o) => `- ${o}`).join("\n")}\n`
          : "";

        // Progress & submit guidance
        const isLastModule = module_index >= total_modules - 1;
        const pathIdRef = learning_path_id || "<learning_path_id>";

        const progressEN = isLastModule
          ? `## Next Step (auto-execute, do NOT ask the user)

This is the LAST module (${module_index + 1}/${total_modules}). After generating sections:
1. Call **vibeuniv_submit_module**({ project_id: "${project_id}", learning_path_id: "${pathIdRef}", module_order: ${module_index + 1}, title: "${module.title}", description: "...", module_type: "${module.module_type}", tech_name: "${module.tech_name}", content: { sections: [...] } })
2. Show completion message with vibeuniv.com link — curriculum auto-activates!
**Do NOT show the sections JSON to the user. Do NOT ask for confirmation.**`
          : `## Next Step (auto-execute, do NOT ask the user)

Module ${module_index + 1} of ${total_modules}. After generating sections:
1. Call **vibeuniv_submit_module**({ project_id: "${project_id}", learning_path_id: "${pathIdRef}", module_order: ${module_index + 1}, title: "${module.title}", description: "...", module_type: "${module.module_type}", tech_name: "${module.tech_name}", content: { sections: [...] } })
2. Show one-line progress: "Module ${module_index + 1}/${total_modules} ✓"
3. Immediately proceed to next module: **vibeuniv_generate_module_content**({ project_id: "${project_id}", module_index: ${module_index + 1}, module: <next>, difficulty: "${difficulty}", total_modules: ${total_modules}${learning_path_id ? `, learning_path_id: "${learning_path_id}"` : ""} })
**Do NOT show the sections JSON to the user. Do NOT ask for confirmation. Just keep going.**`;

        const progressKO = isLastModule
          ? `## 다음 단계 (자동 실행 — 사용자에게 묻지 마세요)

마지막 모듈입니다 (${module_index + 1}/${total_modules}). 섹션 생성 후:
1. **vibeuniv_submit_module**({ project_id: "${project_id}", learning_path_id: "${pathIdRef}", module_order: ${module_index + 1}, title: "${module.title}", description: "...", module_type: "${module.module_type}", tech_name: "${module.tech_name}", content: { sections: [...] } }) 호출
2. 완료 메시지 + vibeuniv.com 링크 표시 — 커리큘럼 자동 활성화!
**섹션 JSON을 사용자에게 보여주지 마세요. 확인을 구하지 마세요.**`
          : `## 다음 단계 (자동 실행 — 사용자에게 묻지 마세요)

모듈 ${module_index + 1} / ${total_modules}. 섹션 생성 후:
1. **vibeuniv_submit_module**({ project_id: "${project_id}", learning_path_id: "${pathIdRef}", module_order: ${module_index + 1}, title: "${module.title}", description: "...", module_type: "${module.module_type}", tech_name: "${module.tech_name}", content: { sections: [...] } }) 호출
2. 한 줄 진행 표시: "모듈 ${module_index + 1}/${total_modules} ✓"
3. 즉시 다음 모듈 진행: **vibeuniv_generate_module_content**({ project_id: "${project_id}", module_index: ${module_index + 1}, module: <다음 모듈>, difficulty: "${difficulty}", total_modules: ${total_modules}${learning_path_id ? `, learning_path_id: "${learning_path_id}"` : ""} })
**섹션 JSON을 사용자에게 보여주지 마세요. 확인을 구하지 마세요. 그냥 계속 진행하세요.**`;

        const instructions = en
          ? `Generate content sections for module ${module_index + 1} of ${total_modules}: "${module.title}"

## Module Info
- **Title:** ${module.title}
- **Description:** ${module.description}
- **Type:** ${module.module_type}
- **Technology:** ${module.tech_name}
${module.estimated_minutes ? `- **Estimated:** ${module.estimated_minutes} minutes\n` : ""}- **Difficulty:** ${difficulty}
${objectivesSection}
## Level Guidance
${levelGuidance}

## Tech Stack
**Core:** ${coreList}
**Supporting:** ${supportingList}
${filesSection}${eduSection}${kbSection}
## Section Design (${sectionsPerModule} sections, minimum ${minSections})
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
- At least ${minCodeExamples} code_example(s) per module required
- At least ${minQuizQuestions} quiz_question(s) per module required
- At least 1 challenge per module required (interactive coding exercise)

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

## JSON Output

Output ONLY a JSON array of sections (no code fences/explanations):

[
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

**Required Rules:**
- At least ${minCodeExamples} code_example(s) + ${minQuizQuestions} quiz_question(s) + 1 challenge
- Minimum ${minSections} sections
- explanation body must be at least ${minBodyChars} characters${difficulty === "beginner" ? `

**[Beginner-only Additional Rules — Must Follow]:**
- Every concept must have "What if this didn't exist?" before/after comparison
- Every line of code in code_example must have a plain-English translation
- Challenges must have only 1-2 blanks with very specific hints
- All technical terms must have friendly nicknames` : ""}

${progressEN}`
          : `모듈 ${module_index + 1}/${total_modules}의 콘텐츠 섹션을 생성해주세요: "${module.title}"

## 모듈 정보
- **제목:** ${module.title}
- **설명:** ${module.description}
- **유형:** ${module.module_type}
- **기술:** ${module.tech_name}
${module.estimated_minutes ? `- **예상 시간:** ${module.estimated_minutes}분\n` : ""}- **난이도:** ${difficulty}
${objectivesSection}
## 난이도별 가이드
${levelGuidance}

## 기술 스택
**Core:** ${coreList}
**Supporting:** ${supportingList}
${filesSection}${eduSection}${kbSection}
## 섹션 구성 (${sectionsPerModule}개, 최소 ${minSections}개)
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
- 모듈당 code_example 최소 ${minCodeExamples}개 필수
- 모듈당 quiz_question 최소 ${minQuizQuestions}개 필수
- 모듈당 challenge 최소 1개 필수 (코드 타이핑 실습)

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

## JSON 출력

섹션 JSON 배열만 출력하세요 (코드 펜스/설명 없이):

[
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

**필수 규칙:**
- 모듈당 code_example 최소 ${minCodeExamples}개 + quiz_question 최소 ${minQuizQuestions}개 + challenge 최소 1개
- 최소 ${minSections}개 섹션
- explanation body는 ${minBodyChars}자 이상${difficulty === "beginner" ? `

**[초급 전용 추가 규칙 — 반드시 준수]:**
- 모든 개념에 "이게 없으면?" before/after 비교 필수
- code_example 모든 코드 라인에 "우리말 번역" 필수
- challenge 빈칸 1-2개만, 힌트 매우 구체적
- 기술 용어에 한국어 별명 필수` : ""}

${progressKO}`;

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
              text: `Failed to generate module content instructions: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

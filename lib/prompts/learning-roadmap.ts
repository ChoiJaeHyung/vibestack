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
          "quiz_answer": number (0-based index of correct option, if quiz_question, otherwise omit),
          "quiz_explanation": "string (explanation of correct answer and why wrong answers are wrong, if quiz_question, otherwise omit)",
          "challenge_starter_code": "string (fill-in-the-blank: complete code with key parts replaced by ___BLANK___ placeholders, if challenge, otherwise omit)",
          "challenge_answer_code": "string (complete working solution with all blanks filled in, if challenge, otherwise omit)"
        }
      ]
    }
  }
]`;

import type { EducationalAnalysis } from "@/types/educational-analysis";
import type { ConceptHint } from "@/lib/knowledge/types";
import type { Locale } from "@/types/database";

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

function buildLevelGuidance(level: string, locale: Locale = "ko"): string {
  if (level === "beginner") {
    if (locale === "en") {
      return `   **[Core Principle] Explain as if teaching a 5-6 year old child.**
   Assume they know absolutely nothing. They've never heard of "variables" or "functions."

   **① Explanation depth — Break every new concept into 3 steps (mandatory):**
   - Step 1 Analogy: Use everyday things ("An API is like a restaurant order window 🍜")
   - Step 2 One-sentence definition: Turn the analogy into a technical one-liner ("An API is a protocol for programs to exchange data")
   - Step 3 Code connection: Find a real example in the student's code ("Your app/api/route.ts file is exactly this API!")

   **② "What if this didn't exist?" — before/after comparison mandatory:**
   - For every concept, first show the "what if it's missing?" scenario
   - e.g., "Without middleware? → Anyone can access secret pages without logging in 😱"
   - before (problem) → after (solution) structure makes the "why" click immediately

   **③ Analogy principles — Use only things kids know:**
   - 🍕 Food: API→restaurant order window, database→refrigerator, cache→lunchbox
   - 🧱 LEGO: component→LEGO brick, library→LEGO instruction manual, props→brick color
   - 🏫 School: routing→classroom numbers, auth→ID badge, middleware→security guard
   - 🎮 Play: events→pressing game buttons, async→sending a letter and waiting for a reply
   - Give technical terms friendly nicknames: useState→"memory box", props→"delivery box", middleware→"security checkpoint"

   **④ Encouragement, praise & emojis — use generously:**
   - 🎯 One-line summary at the end of each section
   - 💡 Tip: practical advice
   - ⚠️ Watch out: common mistake warnings
   - 👏 Praise every 2-3 explanations: "👏 Amazing! If you've understood this far, you're doing great!"
   - 🎉 Celebration at module end: "🎉 Congrats! You now understand X!"
   - Use emojis liberally throughout (no dry explanations)

   **⑤ Section composition & tone:**
   - concept modules 40%+, quiz modules 20%+, practical 15% max (very easy only)
   - 50%+ quizzes should be analogy-based ("If an API is a restaurant order window, what's the menu?")
   - Every line of code needs a plain-English translation (e.g., \`const x = 5\` → "We're putting the number 5 into a box named x")
   - Tone: gentle and patient, like reading a picture book — "Let's look at this together!", "See? Easier than you thought! 😊"
   - Short sentences (ideally under 15 words each), one idea per sentence
   - One concept at a time — never pile multiple concepts together`;
    }
    return `   **[대원칙] 5~6세 아이에게 설명한다고 생각하세요.**
   아무것도 모른다고 가정하세요. "변수가 뭔지", "함수가 뭔지"조차 처음 듣는 사람이에요.

   **① 설명 깊이 — 개념을 3단계로 쪼개기 (모든 새 개념에 필수):**
   - 1단계 비유: 아이가 아는 것으로 비유 ("API는 분식집 주문 창구예요 🍜")
   - 2단계 한 문장 정의: 비유를 기술 용어로 바꿔 한 문장으로 ("API는 프로그램끼리 데이터를 주고받는 약속이에요")
   - 3단계 코드 연결: 학생 코드에서 실제 예시 찾기 ("여러분의 app/api/route.ts 파일이 바로 이 API예요!")

   **② "이게 없으면 어떻게 될까요?" — before/after 비교 필수:**
   - 개념을 설명할 때마다 "만약 이게 없다면?" 시나리오를 먼저 보여주세요
   - 예: "미들웨어가 없으면? → 아무나 로그인 없이 비밀 페이지에 들어갈 수 있어요 😱"
   - 예: "타입이 없으면? → 숫자를 넣어야 하는 곳에 글자를 넣어도 아무도 안 알려줘요"
   - before(문제 상황) → after(해결) 구조로 설명하면 "왜 필요한지"가 바로 와닿아요

   **③ 비유 원칙 — 아이들이 아는 것만 사용:**
   - 🍕 음식: API→분식집 주문 창구, 데이터베이스→냉장고, 캐시→도시락
   - 🧱 레고: 컴포넌트→레고 블록, 라이브러리→레고 세트 설명서, props→블록 색깔
   - 🏫 학교: 라우팅→교실 번호, 인증→출입증, 미들웨어→보안 아저씨
   - 🎮 놀이: 이벤트→게임 버튼 누르기, 비동기→친구한테 편지 보내고 답장 기다리기
   - 기술 용어에 한국어 별명 붙이기: useState→"기억 상자", props→"택배 상자", middleware→"보안 검문소"

   **④ 격려·칭찬·이모지를 대폭 늘리기:**
   - 🎯 한 줄 정리: 섹션 끝마다 "🎯 한 줄 정리: ..."로 핵심 요약
   - 💡 팁: "💡 꿀팁: ..."으로 실용적 조언
   - ⚠️ 주의: "⚠️ 조심! ..."으로 흔한 실수 경고
   - 👏 칭찬: 설명 2-3개마다 "👏 대단해요! 여기까지 이해했으면 정말 잘하고 있는 거예요!"
   - 🎉 축하: 모듈 마지막에 "🎉 축하해요! 이제 여러분은 X를 이해하는 사람이에요!"
   - 문장 사이사이에 이모지를 적극 활용 (딱딱한 설명 금지)

   **⑤ 섹션 구성 & 톤:**
   - concept 모듈 40% 이상, quiz 모듈 20% 이상, practical은 15% 이하(아주 쉬운 것만)
   - quiz의 50% 이상은 비유 기반 ("API가 분식집 주문 창구라면, 메뉴판은 뭘까요?")
   - 코드 한 줄마다 개별 "우리말 번역" 필수 (예: \`const x = 5\` → "x라는 이름의 상자에 숫자 5를 넣는 거예요")
   - 톤: 그림책 읽어주듯 부드럽고 천천히 — "자, 이제 같이 볼까요~?", "어때요, 생각보다 쉽죠? 😊"
   - 짧은 문장 위주 (한 문장 15자 이내 권장), 한 문장에 하나의 아이디어만
   - 한 번에 하나의 개념만 — 여러 개념을 한꺼번에 설명하지 않기`;
  }
  if (level === "intermediate") {
    if (locale === "en") {
      return `   - Assume basic programming knowledge
   - Focus on "how" and "why" — not just usage but underlying mechanics and design rationale
   - Emphasize practical and project_walkthrough modules
   - Cover common patterns, best practices, and frequent mistakes — when discussing mistakes, empathize: "This is a really common one — I made the same mistake when I started too"
   - Tone: like a senior developer doing a code review — "This part works better if you do it this way", "This is why we use this pattern"`;
    }
    return `   - 기본 프로그래밍 지식은 안다고 가정
   - "어떻게"와 "왜"에 집중 — 단순 사용법이 아니라 동작 원리와 설계 이유
   - practical과 project_walkthrough 모듈 비중 높이기
   - 일반적인 패턴, 베스트 프랙티스, 흔한 실수를 다루되, 실수 얘기 시 "이런 실수 많이 하거든요, 저도 처음에 그랬어요" 식으로 공감
   - 톤: 같이 일하는 선배 개발자가 코드 리뷰하며 알려주듯 — "이 부분은 이렇게 하면 더 좋아요", "이런 이유로 이 패턴을 쓰는 거예요"`;
  }
  if (locale === "en") {
    return `   - Assume strong programming knowledge
   - Focus on advanced patterns, performance optimization, and architecture design
   - Maximize practical and project_walkthrough modules
   - Cover edge cases, internal mechanics, and optimization strategies
   - Tone: like a peer-to-peer tech discussion — "Let's examine the trade-offs of this approach", "This scenario comes up quite often in production"`;
  }
  return `   - 탄탄한 프로그래밍 지식 전제
   - 고급 패턴, 성능 최적화, 아키텍처 설계에 집중
   - practical과 project_walkthrough 비중 극대화
   - 엣지 케이스, 내부 동작 원리, 최적화 전략 다루기
   - 톤: 같은 개발자끼리 기술 토론하듯 — "이 접근 방식의 트레이드오프를 살펴볼까요?", "실무에서는 이런 상황이 꽤 자주 발생하거든요"`;
}

// ─── Educational Analysis Context Builder ─────────────────────────────

function formatStructureContext(
  analysis: EducationalAnalysis,
  level: string,
): string {
  const sections: string[] = [];

  // Project Overview
  const ov = analysis.project_overview;
  sections.push(`## Project Overview (AI 분석 결과)

- **앱 설명:** ${ov.one_liner}
- **앱 유형:** ${ov.app_type}
- **대상 사용자:** ${ov.target_users}
- **핵심 기능:** ${ov.core_features.join(", ")}`);

  // User Flows
  if (analysis.user_flows.length > 0) {
    const flowLines = analysis.user_flows.map((f) => {
      const steps = f.steps
        .map((s) => `    - ${s.description} (${s.file}:${s.line_range})`)
        .join("\n");
      return `- **${f.name}** (${f.difficulty})\n  트리거: ${f.trigger}\n${steps}`;
    });
    sections.push(`## User Flows\n\n${flowLines.join("\n\n")}`);
  }

  // File Difficulty Map
  if (analysis.file_analysis.length > 0) {
    const fileLines = analysis.file_analysis
      .sort((a, b) => a.complexity - b.complexity)
      .map(
        (f) =>
          `- \`${f.path}\` — ${f.role} (복잡도: ${f.complexity}/5, ${f.difficulty})`,
      );
    sections.push(`## File Difficulty Map\n\n${fileLines.join("\n")}`);
  }

  // Learning Priorities for level
  const priorities = analysis.learning_priorities;
  const lp =
    level === "beginner"
      ? priorities.beginner
      : level === "intermediate"
        ? priorities.intermediate
        : priorities.advanced;

  const priorityLines = [
    `- **시작:** ${lp.start_with.join(", ")}`,
    `- **집중:** ${lp.focus_on.join(", ")}`,
  ];
  if ("skip_for_now" in lp) {
    priorityLines.push(
      `- **나중에:** ${(lp as typeof priorities.beginner).skip_for_now.join(", ")}`,
    );
  }
  if ("deep_dive" in lp) {
    priorityLines.push(
      `- **심화:** ${(lp as typeof priorities.intermediate).deep_dive.join(", ")}`,
    );
  }
  if ("challenge_topics" in lp) {
    priorityLines.push(
      `- **도전:** ${(lp as typeof priorities.advanced).challenge_topics.join(", ")}`,
    );
  }
  sections.push(
    `## Learning Priorities for ${level}\n\n${priorityLines.join("\n")}`,
  );

  // Repeated Patterns
  if (analysis.repeated_patterns.length > 0) {
    const patternLines = analysis.repeated_patterns.map(
      (p) =>
        `- **${p.name}**: ${p.description} (${p.occurrences.length}회 발견) — ${p.teaching_value}`,
    );
    sections.push(`## Repeated Patterns\n\n${patternLines.join("\n")}`);
  }

  return sections.join("\n\n");
}

function formatContentContext(
  analysis: EducationalAnalysis,
  level: string,
  relevantPaths: string[],
): string {
  const sections: string[] = [];

  // Per-file educational metadata (only for relevant files)
  const relevantSet = new Set(relevantPaths);
  const relevantFiles = analysis.file_analysis.filter((f) =>
    relevantSet.has(f.path),
  );

  if (relevantFiles.length > 0) {
    const fileLines = relevantFiles.map(
      (f) =>
        `### ${f.path}
- **역할:** ${f.role}
- **핵심 개념:** ${f.key_concepts.join(", ")}
- **선행 지식:** ${f.prerequisites.join(", ")}
- **주의점(gotchas):** ${f.gotchas.join("; ")}
- **강사 노트:** ${f.teaching_notes}`,
    );
    sections.push(
      `## Educational Metadata (파일별 교육 정보)\n\n${fileLines.join("\n\n")}`,
    );
  }

  // Code quality observations
  const cq = analysis.code_quality;
  if (cq.good_practices.length > 0 || cq.improvement_areas.length > 0) {
    const lines: string[] = [];
    if (cq.good_practices.length > 0) {
      lines.push("### Good Practices (교육 포인트)");
      for (const gp of cq.good_practices) {
        lines.push(`- ${gp.description} → **교육:** ${gp.concept}`);
      }
    }
    if (cq.improvement_areas.length > 0) {
      lines.push("\n### Teaching Opportunities");
      for (const ia of cq.improvement_areas) {
        lines.push(
          `- [${ia.severity}] ${ia.description} → **교육:** ${ia.teaching_opportunity}`,
        );
      }
    }
    sections.push(
      `## Code Quality Observations\n\n${lines.join("\n")}`,
    );
  }

  // Tech Stack Metaphors (for beginner level)
  if (level === "beginner" && analysis.project_overview.tech_stack_metaphors.length > 0) {
    const metaphorLines = analysis.project_overview.tech_stack_metaphors.map(
      (m) => `- **${m.tech_name}** → ${m.metaphor}`,
    );
    sections.push(
      `## Tech Stack Metaphors (비유)\n\n${metaphorLines.join("\n")}`,
    );
  }

  return sections.join("\n\n");
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
  educationalAnalysis?: EducationalAnalysis,
  locale: Locale = "ko",
): string {
  const level = userLevel ?? "beginner";
  const techListSection = buildTechListSection(techStacks);

  const educationalContext = educationalAnalysis
    ? `\n\n${formatStructureContext(educationalAnalysis, level)}\n`
    : "";

  const educationalInstruction = educationalAnalysis
    ? `
13. **Use the Project Overview, User Flows, and Learning Priorities above** to create a more targeted and personalized roadmap. Prioritize the files and concepts marked in the Learning Priorities section. Reference the File Difficulty Map to set appropriate estimated_minutes for each module.
14. **Repeated Patterns → 전용 모듈 생성:** 위 Repeated Patterns에 나열된 패턴이 2회 이상 발견된 경우, 해당 패턴을 설명하는 전용 모듈을 반드시 1개 이상 만드세요. module_type은 \`concept\` 또는 \`project_walkthrough\`로 지정하세요.
15. **User Flows → project_walkthrough 매핑:** 위 User Flows에 나열된 각 flow에 대해, 해당 flow를 따라가는 \`project_walkthrough\` 모듈을 최소 1개 생성하세요. flow의 steps에 나열된 파일을 relevant_files에 포함하세요.
16. **File Difficulty → estimated_minutes 매핑:** File Difficulty Map의 복잡도(1-5)를 참고하여 관련 모듈의 estimated_minutes를 설정하세요. 복잡도 1-2: 15-20분, 복잡도 3: 25-30분, 복잡도 4-5: 35-45분.`
    : "";

  const baseExtraRules = `
11. **총 모듈 수 제한:** 전체 모듈 수는 최소 15개, 최대 40개 사이여야 합니다. 기술 수가 적으면 각 기술에 더 많은 모듈을, 기술 수가 많으면 핵심 기술에 집중하되 모든 기술을 커버하세요.
12. **기술 누락 금지:** 위 Technology Stack에 나열된 모든 기술은 반드시 최소 1개 이상의 모듈에서 다뤄져야 합니다. 어떤 기술도 빠뜨리지 마세요.`;

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
${educationalContext}
## Instructions

${locale === "en" ? "Write ALL output in English. Module titles, descriptions, and learning_objectives should all be in English." : "Write ALL output in Korean (한국어). Module titles, descriptions, and learning_objectives should all be in Korean."}

Create the STRUCTURE of a learning roadmap (no content bodies yet). Follow these rules:

1. **Start with the most important technology** (core framework first, then languages, then supporting tools).
2. **Order by dependency** — prerequisites come before dependents (e.g., teach JavaScript basics before React, teach React before Next.js).
3. **기술별 최소 모듈 수 (반드시 준수):**
   - \`core\` importance 기술: 최소 5개 모듈
   - \`primary\` importance 기술: 최소 3개 모듈
   - \`secondary\` importance 기술: 최소 2개 모듈
   - \`utility\` importance 기술: 최소 1개 모듈
   - 위에 나열된 **모든 기술**을 반드시 하나 이상의 모듈로 커버해야 합니다. 기술을 빠뜨리면 안 됩니다.
4. **Each module should be 15-45 minutes** of focused learning time.
5. **Mix module types:**
   - \`concept\` — Explain a core concept with clear analogies and examples
   - \`practical\` — Hands-on coding exercise or walkthrough
   - \`quiz\` — Knowledge check with multiple choice questions
   - \`project_walkthrough\` — Walk through how this concept appears in their actual project
6. **For ${level} level:**
${buildLevelGuidance(level, locale)}${level === "beginner" ? `
   **[초급 모듈 비중 규칙 — 반드시 준수]:**
   - concept 모듈: 전체의 40% 이상
   - quiz 모듈: 전체의 20% 이상
   - practical 모듈: 전체의 15% 이하 (아주 쉬운 것만)
   - estimated_minutes: 25-45분 (더 상세한 설명 때문에 기본 시간 증가)` : ""}
7. **relevant_files** — List specific file paths from the project that are relevant to this module. Use actual paths from the project digest above.
8. **learning_objectives** — List 2-4 specific things the student will learn in this module.
9. **Organize modules by layer** — Help the student understand the frontend/backend boundary. For web apps, organize modules to cover: routing/pages (프론트엔드), API endpoints (백엔드), database access patterns (데이터베이스), authentication flow (인증), and shared utilities (공통 유틸리티).
10. **For \`project_walkthrough\` modules** — Ensure relevant_files contains the specific file(s) the walkthrough will cover. Each project_walkthrough module should focus on one file or one tightly related group of files.${baseExtraRules}${educationalInstruction}

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
  educationalAnalysis?: EducationalAnalysis,
  kbHints?: ConceptHint[],
  locale: Locale = "ko",
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

  const kbSection = kbHints && kbHints.length > 0
    ? `\n## Educational Key Points for ${techName}\n\n이 기술의 핵심 교육 포인트입니다. 콘텐츠 생성 시 이 포인트들을 반드시 포함하고, 퀴즈 주제를 참고하세요.\n\n${kbHints.map(h => `### ${h.concept_name}\n- **핵심 포인트:** ${h.key_points.join(" | ")}\n- **퀴즈 주제:** ${h.common_quiz_topics.join(", ")}`).join("\n\n")}\n`
    : "";

  return `You are an expert programming instructor creating personalized educational content for a "vibe coder" learning **${techName}**.

The student built a working application using AI coding tools and wants to deeply understand their own code. Your job is to generate module content that directly references their actual project files.

## Student Level: ${level}

## Modules to Generate Content For

${modulesSection}

## Student's Actual Source Code

${codeSection}
${kbSection}
${educationalAnalysis ? `\n${formatContentContext(educationalAnalysis, level, relevantCode.map((f) => f.path))}\n` : ""}
## Instructions

${locale === "en" ? "Write ALL content in English. Module titles, descriptions, explanations, quiz questions, quiz options, and challenges should all be in English." : "Write ALL content in Korean (한국어). Module titles, descriptions, explanations, quiz questions, quiz options, and challenges should all be in Korean. Technical terms (e.g., \"middleware\", \"API route\") can stay in English but explanations must be in Korean."}

For each module listed above, generate detailed content sections. Follow these rules:

1. **Reference the student's actual code with specific line numbers.** When explaining a concept, point to specific lines in the student's files. For example: "여러분의 \`middleware.ts\`를 보면, 5번째 줄에서 \`updateSession()\`을 호출하고 있어요. 이게 매 요청마다 세션을 갱신하는 역할이에요." Never invent code that doesn't exist in the files above.
2. **Content sections for each module:**
   - \`explanation\` — Clear markdown text explaining a concept, referencing the student's code with specific file paths and line numbers
   - \`code_example\` — An ACTUAL code snippet copied FROM the student's project files above (must include \`code\` field). Include the file path in the title (e.g., "app/api/auth/route.ts 살펴보기"). In the body, explain what each important line does with Korean comments.
   - \`quiz_question\` — Multiple choice question based on the student's actual code (must include \`quiz_options\` and \`quiz_answer\` fields). For example: "\`app/layout.tsx\`에서 \`<html lang='ko'>\`를 사용하는 이유는 무엇일까요?"
   - \`challenge\` — A small, concrete coding challenge the student can try on their own project. Be specific about which file to modify and what to add. For example: "\`app/api/v1/projects/route.ts\`에 새로운 쿼리 파라미터를 추가해서 프로젝트를 상태별로 필터링하는 기능을 만들어 보세요."
   - \`reflection\` — A short "생각해보기" prompt (1-3 sentences) asking the student to pause and think. No quiz_options needed. For example: "만약 이 미들웨어가 없다면 어떤 문제가 생길까요? 한번 상상해 보세요."
3. **Each module MUST have ${level === "beginner" ? "7-12" : "5-8"} sections.** Each explanation section should be thorough — ${level === "beginner" ? "8-12 paragraphs" : "5-8 paragraphs"} with step-by-step explanations. Use a mix of paragraphs and bullet points. Longer, detailed explanations are better than short, cryptic ones. Treat each explanation like a mini-lesson.${level === "beginner" ? " Each explanation body MUST be at least 400 characters." : ""}
4. **Interleave interactive sections:** After every 1-2 explanation/code_example sections, insert a quiz_question or reflection section. Never have more than 2 explanation sections in a row.
5. **Friendly, warm, encouraging tone:** ${locale === "en" ? `Make the student feel "I can do this with this teacher!"

   **Tone rules (mandatory):**
   - Use casual, friendly "you" language
   - Address the student as "you" or "we"
   - Short sentences, one idea per sentence

   **Encouragement and empathy (mandatory — at least once per explanation section):**
   - Opening: "Ever looked at this code and thought 'what does this do?' Don't worry, let's break it down together 😊"
   - Mid-section: "If you've followed along this far, you already understand half of it!", "This part can be tricky, so let's take it slow"
   - Closing: "Amazing! You now know how X works 👏"

   **Transition phrases (natural flow):**
   - "Alright, now let's..." / "Hold on a second!" / "But here's an interesting question..."
   - "Let's see how this looks in your actual code"
   - "Hearing about it is one thing — let's check the code directly"

   **Analogies and everyday connections (mandatory — for every new concept):**
   - "An API is like a restaurant order window — you place an order (request) and get food (data) back"
   - "Components are like LEGO bricks. You combine small bricks to build bigger structures"
   - "Middleware is like the security checkpoint at a building entrance. Everyone must pass through before going in"

   **Forbidden patterns:**
   - ❌ Dry academic tone or textbook style
   - ❌ Stiff commands: "Execute the following", "You must understand"
   - ❌ Emotionless listing: just dumping definitions without context
   - ❌ Overly formal language

   **Hook questions to start each section:**
   - "Have you ever opened this file in your project?"
   - "Why do we do it this way? Is there an easier approach?"
   - "Let's look at this code together — it's simpler than you think!"` : `학생이 "이 선생님한테 배우면 나도 할 수 있겠다"고 느끼게 해주세요.

   **어투 규칙 (필수):**
   - 해요체 사용 (~이에요, ~거든요, ~잖아요, ~할 수 있어요, ~해볼까요?)
   - 학생을 "여러분" 또는 "우리"로 지칭
   - 짧은 문장 위주, 한 문장에 하나의 아이디어만

   **격려와 공감 (필수 — 각 explanation 섹션에 최소 1회):**
   - 시작부: "혹시 이런 코드 보면서 '이게 뭐지?' 싶었던 적 있으세요? 걱정 마세요, 같이 하나씩 풀어볼게요 😊"
   - 중간 격려: "여기까지 따라오셨으면 벌써 절반은 이해하신 거예요!", "이 부분이 좀 헷갈릴 수 있는데, 천천히 가볼게요"
   - 마무리 칭찬: "대단해요! 이제 여러분은 X가 어떻게 동작하는지 아는 사람이에요 👏"

   **전환 어구 (자연스러운 흐름):**
   - "자, 그러면 이제..." / "여기서 잠깐!" / "그런데 한 가지 궁금한 게 있죠?"
   - "실제로 여러분의 코드에서 어떻게 쓰이는지 볼까요?"
   - "말로만 들으면 어려울 수 있으니, 코드로 직접 확인해봐요"

   **비유와 일상 연결 (필수 — 새 개념 등장 시마다):**
   - "API는 식당 주문 창구 같은 거예요 — 주문(요청)을 넣으면 음식(데이터)이 나오죠"
   - "컴포넌트는 레고 블록이에요. 작은 블록을 조합해서 큰 구조를 만드는 거거든요"
   - "미들웨어는 건물 입구의 보안 검색대예요. 모든 사람이 들어가기 전에 한 번 거쳐야 하죠"

   **금지 패턴:**
   - ❌ 교과서체/논문체: "~이다", "~하라", "~것이다", "~해야 한다"
   - ❌ 딱딱한 명령형: "다음을 수행하시오", "이해해야 합니다"
   - ❌ 감정 없는 나열: 개념을 그냥 정의만 던지고 넘어가는 것
   - ❌ 영어 직역투: "이것은 ~의 역할을 한다" → "이건 ~하는 역할이에요"

   **Hook question으로 시작 (각 섹션 첫 문장):**
   - "혹시 여러분의 프로젝트에서 이 파일 열어보신 적 있으세요?"
   - "왜 이렇게 할까요? 더 쉬운 방법은 없을까요?"
   - "이 코드 한번 같이 볼까요? 생각보다 간단해요!"`}
6. **Citations and References:** Every explanation and code_example section MUST include relevant official documentation links as markdown. At the end of each explanation section, add a '${locale === "en" ? "📚 Learn More" : "📚 더 알아보기"}' subsection with 2-3 clickable links to the most relevant docs:
   - React → [React 공식 문서](https://react.dev)
   - Next.js → [Next.js 공식 문서](https://nextjs.org/docs)
   - JavaScript/TypeScript → [MDN Web Docs](https://developer.mozilla.org)
   - Tailwind CSS → [Tailwind CSS 문서](https://tailwindcss.com/docs)
   - Supabase → [Supabase 문서](https://supabase.com/docs)
   Use specific page URLs, not just homepages.
7. **Detailed Code Walkthroughs:** For code_example sections, do NOT just show code. After the code block, provide a line-by-line explanation in numbered list format. For example:
   1. \`const supabase = createClient()\` — Supabase 클라이언트를 생성합니다.
   2. \`const { data } = await supabase.from('users')...\` — users 테이블에서 데이터를 가져옵니다. await는 데이터가 올 때까지 기다리라는 뜻이에요.
8. **Quiz questions** should have exactly 4 options with one correct answer (0-indexed). Always include a \`quiz_explanation\` field: explain why the correct answer is right and briefly note why the main wrong answers are incorrect (2-4 sentences).
9. **For ${level} level:**
${buildLevelGuidance(level, locale)}${level === "beginner" ? `
   **[초급 전용 추가 규칙 — 반드시 준수]:**
   - explanation body는 최소 400자 이상 — 짧은 설명 금지
   - 모든 개념에 "이게 없으면 어떻게 될까요?" before/after 비교 필수
   - code_example의 모든 코드 라인에 "우리말 번역" 필수 (예: \`const x = 5\` → "x라는 이름표가 붙은 상자에 숫자 5를 넣어요 📦")
   - quiz의 50% 이상은 비유 기반 문제 ("컴포넌트가 레고 블록이라면, props는 뭘까요?")
   - explanation 2개마다 reflection 1개 삽입 (학생이 멈추고 생각하게)
   - challenge는 빈칸 1-2개만, 힌트는 매우 구체적으로 ("이 빈칸에는 '데이터를 가져오는 함수 이름'이 들어가요. 힌트: fetch로 시작해요!")
   - 기술 용어에 한국어 별명 필수: useState→"기억 상자", props→"택배 상자", middleware→"보안 검문소"` : ""}
10. **For \`project_walkthrough\` modules:** Walk through one of the student's actual files from top to bottom. Start with the imports (각 라이브러리가 무슨 역할인지), then the main logic (핵심 로직 설명), then the exports (다른 파일에서 어떻게 사용되는지). Explain how this file connects to the rest of the project. Use the actual code from the source files above — do NOT paraphrase or abbreviate.
11. **For \`code_example\` sections:** Use ACTUAL code snippets FROM the student's files, not invented examples. Include the file path and add Korean comments explaining what each important line does. For example:
   \`\`\`
   // app/api/auth/route.ts에서 가져온 코드
   const supabase = createClient()  // Supabase 클라이언트 생성
   const { data } = await supabase.auth.getUser()  // 현재 로그인한 사용자 정보 가져오기
   \`\`\`
12. **For \`challenge\` sections:** Use a **fill-in-the-blank** format, NOT a full rewrite. The \`challenge_starter_code\` should be the COMPLETE working code from the student's project, but with 2-4 key parts replaced by \`___BLANK___\` placeholders. The student only needs to fill in the blanks, not write everything from scratch. In the \`body\`, provide numbered hints for each blank (e.g., "1번 빈칸: 이 함수는 데이터를 가져오는 역할이에요"). The \`challenge_answer_code\` should be the complete solution with all blanks filled in. Example:
   \`\`\`
   // challenge_starter_code:
   const { data } = await supabase
     .from(___BLANK_1___)          // 힌트: 어떤 테이블에서 가져올까요?
     .select(___BLANK_2___)        // 힌트: 어떤 컬럼이 필요할까요?
     .eq('user_id', user.id)
   \`\`\`${educationalAnalysis ? `
13. **Use the Educational Metadata above** to enrich your content. Reference gotchas as quiz questions, use teaching_notes for explanation sections, and leverage code quality observations as practical learning points. For beginner level, use the Tech Stack Metaphors to make concepts accessible.` : ""}

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
            "quiz_answer": number (0-based index of correct option, if quiz_question, otherwise omit),
            "quiz_explanation": "string (explanation of correct answer and why wrong answers are wrong, if quiz_question, otherwise omit)",
            "challenge_starter_code": "string (fill-in-the-blank: complete code with key parts replaced by ___BLANK___ placeholders, if challenge, otherwise omit)",
            "challenge_answer_code": "string (complete working solution, if challenge, otherwise omit)"
          }
        ]
      }
    }
  ]
}`;

export function buildRoadmapPrompt(
  techStacks: TechStackInput[],
  userLevel?: "beginner" | "intermediate" | "advanced",
  locale: Locale = "ko",
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
${buildLevelGuidance(level, locale)}
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

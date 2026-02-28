import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VibeUnivClient } from "../lib/api-client.js";
import type { CurriculumContext, ConceptHintItem, EducationalAnalysisData, TechStackItem } from "../types.js";

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

function formatKBHints(kbHints: Record<string, ConceptHintItem[]>): string {
  const sections: string[] = [];

  for (const [techName, hints] of Object.entries(kbHints)) {
    if (hints.length === 0) continue;

    const conceptLines = hints.map((h) =>
      `#### ${h.concept_name} (\`${h.concept_key}\`)
- **핵심 포인트:**
${h.key_points.map((p) => `  - ${p}`).join("\n")}
- **좋은 퀴즈 주제:** ${h.common_quiz_topics.join(", ")}
- **선행 개념:** ${h.prerequisite_concepts.length > 0 ? h.prerequisite_concepts.join(", ") : "(없음)"}`
    ).join("\n\n");

    sections.push(`### ${techName} 핵심 개념 가이드\n\n${conceptLines}`);
  }

  return sections.length > 0
    ? `## 교육 핵심 포인트 (Knowledge Base)

아래는 각 기술의 **핵심 교육 포인트**입니다.
커리큘럼에 반드시 이 포인트들을 포함하고, 퀴즈 주제를 참고하세요.
선행 개념 순서에 맞게 모듈을 배치하세요.

${sections.join("\n\n")}`
    : "";
}

function formatEducationalAnalysis(
  analysis: EducationalAnalysisData,
  difficulty: string,
): string {
  const sections: string[] = [];

  // Project Overview
  const ov = analysis.project_overview;
  sections.push(`### 프로젝트 개요 (AI 분석 결과)
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
      return `- **${f.name}** (난이도: ${f.difficulty})\n  트리거: ${f.trigger}\n${steps}`;
    });
    sections.push(`### 사용자 흐름 (User Flows)\n\n각 흐름을 커리큘럼에서 다뤄야 합니다:\n\n${flowLines.join("\n\n")}`);
  }

  // File Difficulty Map
  if (analysis.file_analysis.length > 0) {
    const fileLines = analysis.file_analysis
      .sort((a, b) => a.complexity - b.complexity)
      .map((f) => `- \`${f.path}\` — ${f.role} (복잡도: ${f.complexity}/5, ${f.difficulty})`);
    sections.push(`### 파일 난이도 맵\n\n쉬운 파일부터 어려운 파일 순서로 정렬했습니다. 모듈 순서를 결정할 때 참고하세요:\n\n${fileLines.join("\n")}`);
  }

  // Learning Priorities
  const priorities = analysis.learning_priorities;
  const lp = difficulty === "beginner"
    ? priorities.beginner
    : difficulty === "intermediate"
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
  sections.push(`### ${difficulty} 난이도 학습 우선순위\n\n${priorityLines.join("\n")}`);

  // Repeated Patterns
  if (analysis.repeated_patterns.length > 0) {
    const patternLines = analysis.repeated_patterns.map(
      (p) => `- **${p.name}**: ${p.description} (${p.occurrences.length}회 발견) — 교육 가치: ${p.teaching_value}`,
    );
    sections.push(`### 반복 패턴\n\n프로젝트에서 반복적으로 사용되는 패턴입니다. 이 패턴들을 커리큘럼에 포함하면 학습 효과가 높아집니다:\n\n${patternLines.join("\n")}`);
  }

  // Code Quality
  const cq = analysis.code_quality;
  if (cq.good_practices.length > 0 || cq.improvement_areas.length > 0) {
    const lines: string[] = [];
    if (cq.good_practices.length > 0) {
      lines.push("**좋은 사례 (교육 포인트):**");
      for (const gp of cq.good_practices) {
        lines.push(`- ${gp.description} → 관련 개념: ${gp.concept}`);
      }
    }
    if (cq.improvement_areas.length > 0) {
      lines.push("\n**개선 기회 (학습 기회):**");
      for (const ia of cq.improvement_areas) {
        lines.push(`- [${ia.severity}] ${ia.description} → 교육: ${ia.teaching_opportunity}`);
      }
    }
    sections.push(`### 코드 품질 관찰\n\n${lines.join("\n")}`);
  }

  // Tech Stack Metaphors (beginner only)
  if (difficulty === "beginner" && ov.tech_stack_metaphors.length > 0) {
    const metaphorLines = ov.tech_stack_metaphors.map(
      (m) => `- **${m.tech_name}** → ${m.metaphor}`,
    );
    sections.push(`### 기술 스택 비유 (초보자용)\n\n이 비유들을 커리큘럼에서 적극 활용하세요:\n\n${metaphorLines.join("\n")}`);
  }

  return `## 프로젝트 교육 분석 (Educational Analysis)

아래는 AI가 프로젝트를 분석한 교육용 메타데이터입니다.
이 정보를 활용해 더 구체적이고 맞춤화된 커리큘럼을 만드세요.

${sections.join("\n\n")}`;
}

function buildLevelGuidance(difficulty: string): string {
  if (difficulty === "beginner") {
    return `- "X가 뭔가요?"부터 시작 — 기술이 왜 존재하는지, 없으면 어떤 문제가 생기는지부터 설명
   - 전문 용어를 쓸 때는 반드시 바로 뒤에 쉬운 말로 풀어서 설명 (예: "미들웨어(middleware)란, 요청이 들어올 때마다 자동으로 실행되는 '검문소' 같은 코드예요")
   - 일상생활 비유를 적극 활용 (예: "컴포넌트는 레고 블록", "API는 식당 주문 창구", "데이터베이스는 엑셀 스프레드시트")
   - concept과 quiz 모듈을 많이, practical은 아주 쉬운 것만
   - 한 번에 하나의 개념만 — 여러 개념을 한꺼번에 설명하지 않기`;
  }
  if (difficulty === "intermediate") {
    return `- 기본 프로그래밍 지식은 안다고 가정
   - "어떻게"와 "왜"에 집중 — 단순 사용법이 아니라 동작 원리와 설계 이유
   - practical과 project_walkthrough 모듈 비중 높이기
   - 일반적인 패턴, 베스트 프랙티스, 흔한 실수 다루기`;
  }
  return `- 탄탄한 프로그래밍 지식 전제
   - 고급 패턴, 성능 최적화, 아키텍처 설계에 집중
   - practical과 project_walkthrough 비중 극대화
   - 엣지 케이스, 내부 동작 원리, 최적화 전략 다루기`;
}

// ─── Tool registration ──────────────────────────────────────────────

export function registerGenerateCurriculum(server: McpServer, client: VibeUnivClient): void {
  server.tool(
    "vibeuniv_generate_curriculum",
    "Generate a learning curriculum for the project. Returns tech stack info and a JSON schema — you create the curriculum JSON, then submit it with vibeuniv_submit_curriculum.",
    generateCurriculumSchema,
    { readOnlyHint: true, openWorldHint: true },
    async ({ project_id, difficulty }) => {
      try {
        console.error(`[vibeuniv] Generating curriculum instructions for project ${project_id}...`);

        // Fetch all curriculum context in a single API call
        const curriculumContext: CurriculumContext = await client.getCurriculumContext(project_id);

        const techStacks = curriculumContext.techStacks;

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
          : "(없음)";

        const levelGuidance = buildLevelGuidance(difficulty);

        // Build KB hints section
        const kbSection = kbResult && Object.keys(kbResult.techs).length > 0
          ? `\n${formatKBHints(kbResult.techs)}\n`
          : "";

        // Build educational analysis section (with defensive try/catch for LLM-generated data)
        let eduSection = "";
        let hasEduAnalysis = false;
        if (educationalAnalysis) {
          try {
            eduSection = `\n${formatEducationalAnalysis(educationalAnalysis, difficulty)}\n`;
            hasEduAnalysis = true;
          } catch (err) {
            console.error(`[vibeuniv] Educational analysis formatting failed (non-fatal): ${err instanceof Error ? err.message : err}`);
          }
        }

        // Build educational analysis instruction
        const eduInstruction = hasEduAnalysis
          ? `
### 10. 교육 분석 데이터 활용
- **프로젝트 개요**의 핵심 기능과 앱 유형을 커리큘럼 소개에 반영
- **사용자 흐름(User Flows)** 을 project_walkthrough 모듈의 기반으로 활용
- **파일 난이도 맵**을 참고해 모듈 순서와 예상 시간을 설정
- **학습 우선순위**에 따라 모듈 배치를 최적화
- **반복 패턴**을 별도 모듈이나 퀴즈로 다뤄 학습 효과 극대화
- **코드 품질 관찰**의 좋은 사례를 교육 포인트로, 개선 기회를 챌린지로 활용
- 초보자 난이도일 경우 **기술 스택 비유**를 explanation 섹션에 적극 활용`
          : "";

        // Build KB instruction
        const kbInstruction = kbResult && Object.keys(kbResult.techs).length > 0
          ? `
### ${educationalAnalysis ? "11" : "10"}. Knowledge Base 활용
- **핵심 포인트**를 반드시 커리큘럼에 포함 — 빠뜨리지 마세요
- **퀴즈 주제**를 quiz_question 섹션의 주제로 활용
- **선행 개념** 순서에 맞게 모듈을 배치 (선행 개념이 먼저 나와야 함)`
          : "";

        const instructions = `이 프로젝트의 학습 커리큘럼을 생성해주세요. 아래 지시를 꼼꼼히 따라주세요.

## 학생 프로필

이 커리큘럼은 **"바이브 코더(Vibe Coder)"** 를 위한 것입니다.
바이브 코더란, AI 코딩 도구(Claude Code, Cursor, Bolt 등)로 동작하는 앱을 이미 만든 사람입니다.
코드가 돌아가게는 했지만, **왜 이렇게 작동하는지** 이해하고 싶어하는 사람이에요.

- **난이도:** ${difficulty}
- **학습 스타일:** 이미 완성된 프로젝트 기반으로 학습 (추상적 이론 X)
- **목표:** 자기 프로젝트의 기술 스택을 이해해서, 혼자서도 디버깅하고 기능을 추가할 수 있게 되는 것

## 감지된 기술 스택

### 핵심 기술 (Core) — 반드시 다뤄야 함
${coreList}

### 보조 기술 (Supporting) — 선택적으로 다루기
${supportingList}
${eduSection}${kbSection}
## 사전 준비: 프로젝트 파일 분석

**중요:** 커리큘럼 생성 전에 반드시 이 프로젝트의 소스 코드를 읽어주세요.
특히 다음 파일들을 확인하세요:
- 진입점 파일 (예: index.ts, app.tsx, main.py, layout.tsx 등)
- 설정 파일 (예: package.json, tsconfig.json, next.config.ts 등)
- 핵심 비즈니스 로직 파일 (가장 많이 수정된 파일들)
- API 라우트, 데이터베이스 접근 코드

이 파일들의 실제 코드를 커리큘럼에 직접 인용해야 합니다.

## 커리큘럼 설계 원칙

### 1. 모듈 순서 — 의존성 기반
- **가장 중요한 핵심 기술부터** 시작 (core framework → language → supporting tools)
- **선행 지식 → 후행 지식** 순서 (예: JavaScript 기초 → React → Next.js)
- 각 기술당 3-7개 모듈 (중요도와 복잡도에 따라 조절)

### 2. 모듈 유형 믹스
- \`concept\` — 핵심 개념을 비유와 예시로 설명
- \`practical\` — 학생의 실제 코드를 수정하는 실습
- \`quiz\` — 학생의 실제 코드 기반 퀴즈로 이해도 확인
- \`project_walkthrough\` — 학생의 실제 파일을 위에서 아래로 한 줄씩 읽어보기

### 3. 난이도별 접근법
${levelGuidance}

### 4. 각 모듈의 섹션 구성 (5-8개)
섹션 유형과 순서 배치 규칙:
- \`explanation\` — 마크다운으로 개념 설명. **반드시 학생의 실제 파일 경로와 코드를 인용**
- \`code_example\` — 학생의 프로젝트에서 **실제 코드를 복사**해서 한국어 주석으로 설명
- \`quiz_question\` — 학생의 실제 코드 기반 4지선다 퀴즈
- \`challenge\` — 학생의 실제 프로젝트에서 수정해볼 수 있는 구체적 과제
- \`reflection\` — "생각해보기" (1-3문장, 학생이 스스로 고민해보도록)

**배치 규칙:** explanation이나 code_example 1-2개 후에 반드시 quiz_question 또는 reflection을 배치.
explanation만 연속 3개 이상 나오면 안 됩니다.

### 5. 콘텐츠 작성 톤
- **모든 콘텐츠는 한국어** (기술 용어는 영어 유지하되 괄호 안에 한국어 설명 병기)
- **짧은 문장**, **짧은 문단** — 한 단락에 3문장 이하
- **글머리 기호** 적극 사용 — 장문 대신 핵심만
- **질문으로 시작** — "왜 이렇게 할까요?", "이 코드 없이도 동작할까요?"
- **마이크로러닝 느낌** — 각 섹션이 짧은 카드처럼, 강의처럼 느껴지면 안 됨

### 6. 코드 인용 규칙
- explanation: "여러분의 \`middleware.ts\` 파일 5번째 줄을 보면..." 형태로 구체적 파일 + 라인 참조
- code_example: 학생 프로젝트의 **실제 코드를 그대로** 복사하고, 각 줄에 한국어 주석 추가
  예시:
  \`\`\`
  // app/layout.tsx에서 가져온 코드
  export default function RootLayout({ children }) {  // 모든 페이지를 감싸는 최상위 레이아웃
    return <html lang="ko">  // 한국어 페이지라는 것을 브라우저에 알려줌
  \`\`\`
- quiz_question: "여러분의 \`app/page.tsx\`에서 \`export default\`를 쓰는 이유는?"처럼 학생 코드 기반
- challenge: 수정할 파일, 추가할 내용, 기대 결과를 구체적으로 명시
- **코드를 창작하지 마세요** — 반드시 프로젝트에 실재하는 코드를 인용

### 7. 퀴즈 규칙
- 선택지 정확히 4개, 정답은 0-indexed
- \`quiz_explanation\`에 정답 이유 + 오답 이유를 2-4문장으로 설명
- 학생의 실제 코드와 연결된 퀴즈 출제 (추상적 이론 퀴즈 X)

### 8. 챌린지 규칙
- 어떤 파일을 수정할지, 무엇을 추가/변경할지, 결과가 어떻게 바뀌는지 구체적으로
- \`challenge_starter_code\`: TODO 주석이 있는 뼈대 코드
- \`challenge_answer_code\`: 완성된 정답 코드

### 9. project_walkthrough 규칙
- 학생의 실제 파일 하나를 위에서 아래로 읽기
- import 구문 → 핵심 로직 → export 순서로 설명
- 이 파일이 프로젝트의 다른 파일들과 어떻게 연결되는지 설명
${eduInstruction}${kbInstruction}

## JSON 스키마

아래 스키마에 맞는 JSON을 생성하세요.

{
  "title": "string (학습 경로 제목, 한국어)",
  "description": "string (2-3문장, 이 커리큘럼을 마치면 무엇을 할 수 있는지)",
  "difficulty": "${difficulty}",
  "estimated_hours": number,
  "modules": [
    {
      "title": "string (모듈 제목, 한국어)",
      "description": "string (1-2문장 모듈 설명, 한국어)",
      "module_type": "concept | practical | quiz | project_walkthrough",
      "estimated_minutes": number (15-45),
      "tech_name": "string (위 기술 스택 목록의 정확한 이름)",
      "content": {
        "sections": [
          {
            "type": "explanation | code_example | quiz_question | challenge | reflection",
            "title": "string (섹션 제목, 한국어)",
            "body": "string (마크다운 콘텐츠, 한국어)",
            "code": "string (code_example일 때만, 학생의 실제 코드 + 한국어 주석)",
            "quiz_options": ["string", "string", "string", "string"] (quiz_question일 때만),
            "quiz_answer": number (0-3, quiz_question일 때만),
            "quiz_explanation": "string (정답/오답 이유, quiz_question일 때만)",
            "challenge_starter_code": "string (TODO 포함 뼈대, challenge일 때만)",
            "challenge_answer_code": "string (완성 정답, challenge일 때만)"
          }
        ]
      }
    }
  ]
}

## 중요

- JSON만 출력하세요. 코드 펜스(\`\`\`), 설명문, 앞뒤 텍스트 없이 순수 JSON만.
- \`tech_name\`은 위 기술 스택 목록의 이름과 **정확히 일치**해야 합니다.
- 각 모듈당 **5-8개 섹션** 필수.

생성 완료 후 아래 도구로 제출:
vibeuniv_submit_curriculum({ project_id: "${project_id}", curriculum: <생성된 JSON> })`;

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

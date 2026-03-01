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
    "Generate a learning curriculum for the project. IMPORTANT: Before calling this tool, you MUST ask the user which difficulty level they prefer — beginner (초급), intermediate (중급), or advanced (고급). Do NOT default to beginner without asking. Returns tech stack info and a JSON schema — you create the curriculum JSON, then submit it with vibeuniv_submit_curriculum.",
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
          ? `\n**교육 분석 활용:** 프로젝트 개요→소개, User Flows→walkthrough, 파일 난이도→모듈 순서, 학습 우선순위→배치, 반복 패턴→퀴즈, 코드 품질→교육 포인트${difficulty === "beginner" ? ", 비유→explanation" : ""}`
          : "";

        // Build KB instruction
        const kbInstruction = kbResult && Object.keys(kbResult.techs).length > 0
          ? `\n**KB 활용:** 핵심 포인트 필수 포함, 퀴즈 주제 활용, 선행 개념 순서 준수.`
          : "";

        const instructions = `이 프로젝트의 학습 커리큘럼을 생성해주세요.

## 대상: 바이브 코더 (${difficulty})

AI 코딩 도구로 앱을 만들었지만 **왜 작동하는지** 이해하고 싶은 사람. 프로젝트 기반 학습, 추상적 이론 X.

## 기술 스택

**Core (필수):**
${coreList}

**Supporting (선택):**
${supportingList}
${eduSection}${kbSection}
## 설계 원칙

**모듈 순서:** 핵심 기술 먼저 → 선행→후행 순서. 기술당 3-7개 모듈.
**모듈 유형:** concept(개념+비유), practical(코드 실습), quiz(코드 기반 퀴즈), project_walkthrough(파일 라인별 읽기)
**난이도:**
${levelGuidance}

**섹션 구성 (모듈당 5-8개):**
- explanation: 마크다운 설명, 반드시 학생 파일 경로+코드 인용
- code_example: 학생 실제 코드 복사 + 한국어 주석
- quiz_question: 4지선다(0-indexed), quiz_explanation에 정답/오답 이유
- challenge: 수정 파일+내용+결과 명시, starter_code(TODO 뼈대)+answer_code
- reflection: 1-3문장 "생각해보기"

**배치:** explanation/code_example 1-2개 후 반드시 quiz 또는 reflection. explanation 연속 3개 금지.

**톤:** 한국어(기술 용어는 영어 유지+괄호 설명). 짧은 문장, 글머리 기호. 질문으로 시작. 코드 창작 금지 — 프로젝트 실제 코드만 인용.

**walkthrough:** 파일 하나를 import→로직→export 순서로 설명 + 다른 파일과의 연결.
${eduInstruction}${kbInstruction}

## JSON 스키마

{ title, description, difficulty: "${difficulty}", estimated_hours,
  modules: [{ title, description, module_type, estimated_minutes(15-45), tech_name(위 목록과 정확히 일치),
    content: { sections: [{ type, title, body,
      code?(code_example만), quiz_options?[4개], quiz_answer?(0-3), quiz_explanation?,
      challenge_starter_code?, challenge_answer_code? }] } }] }

모든 string 값은 한국어. JSON만 출력 (코드 펜스/설명 없이).

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

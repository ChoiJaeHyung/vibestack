import type { TechStackItem, ConceptHintItem, EducationalAnalysisData, CurriculumContext } from "../types.js";

export type Locale = "ko" | "en";

// ─── Formatting helpers ─────────────────────────────────────────────

export function formatTechStack(t: TechStackItem): string {
  return `- **${t.name}**${t.version ? ` v${t.version}` : ""} (${t.category})`;
}

export function formatKBHints(kbHints: Record<string, ConceptHintItem[]>, locale: Locale): string {
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

  let result = `${header}\n\n${sections.join("\n\n")}`;

  // Append concept_keys vocabulary for LLM tagging
  const vocabLines = Object.values(kbHints)
    .flat()
    .map((h) => `- \`${h.concept_key}\`: ${h.concept_name}`);

  if (vocabLines.length > 0) {
    const vocabHeader = locale === "en"
      ? "### concept_keys Tagging Vocabulary"
      : "### concept_keys 태깅 vocabulary";
    result = `${result}\n\n${vocabHeader}\n${vocabLines.join("\n")}`;
  }

  return result;
}

export function formatEducationalAnalysis(
  analysis: EducationalAnalysisData,
  difficulty: string,
  locale: Locale,
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

export function buildLevelGuidance(difficulty: string, locale: Locale): string {
  const en = locale === "en";
  if (difficulty === "beginner") {
    return en
      ? `**[Core Principle] Explain as if to a 5-6 year old. Assume they know nothing.**
   - 3-step concept breakdown: ①Analogy (food/LEGO/school/play) → ②One-sentence definition → ③Code connection
   - "What if this didn't exist?" before/after comparison (e.g., "No middleware? → Anyone can access secret pages 😱")
   - Translate key code lines into plain English (e.g., \`const x = 5\` → "Put the number 5 in a box called x 📦")
   - Give friendly nicknames to technical terms: useState→"memory box", props→"delivery package", middleware→"security checkpoint"
   - concept 40%+, quiz 20%+, practical 15%↓(very easy only)
   - explanation 800+ chars, 7-10 sections per module
   - Use emojis actively: 🎯summary, 💡tip, ⚠️warning, 👏praise
   - Tone: like reading a picture book, short sentences, lots of encouragement
   - estimated_minutes: 20-35 min`
      : `**[대원칙] 5~6세 아이에게 설명하듯. 아무것도 모른다고 가정.**
   - 개념 3단계 쪼개기: ①비유(음식/레고/학교/놀이) → ②한 문장 정의 → ③코드 연결
   - "이게 없으면?" before/after 비교 (예: "미들웨어 없으면? → 아무나 비밀 페이지 접근 😱")
   - 주요 코드 라인에 "우리말 번역" (예: \`const x = 5\` → "x 상자에 숫자 5를 넣어요 📦")
   - 기술 용어에 한국어 별명: useState→"기억 상자", props→"택배 상자", middleware→"보안 검문소"
   - concept 40%↑, quiz 20%↑, practical 15%↓(아주 쉬운 것만)
   - explanation 800자↑, 모듈당 7-10섹션
   - 이모지 적극 활용: 🎯한줄정리, 💡팁, ⚠️주의, 👏칭찬
   - 톤: 그림책 읽어주듯, 짧은 문장, 격려·칭찬 대폭
   - estimated_minutes: 20-35분`;
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

/**
 * Filter KB hints to only include entries relevant to a specific module's tech_name.
 * Also includes hints for prerequisite technologies.
 */
export function filterKBHintsForModule(
  allHints: Record<string, ConceptHintItem[]>,
  techName: string,
): Record<string, ConceptHintItem[]> {
  const filtered: Record<string, ConceptHintItem[]> = {};

  // Direct match
  if (allHints[techName]) {
    filtered[techName] = allHints[techName];
  }

  // Case-insensitive fallback
  if (!filtered[techName]) {
    for (const [key, hints] of Object.entries(allHints)) {
      if (key.toLowerCase() === techName.toLowerCase()) {
        filtered[techName] = hints;
        break;
      }
    }
  }

  // Also include prerequisites referenced by this tech's hints
  const mainHints = filtered[techName] ?? [];
  for (const hint of mainHints) {
    for (const prereq of hint.prerequisite_concepts) {
      for (const [key, hints] of Object.entries(allHints)) {
        if (hints.some((h) => h.concept_key === prereq) && !filtered[key]) {
          filtered[key] = hints;
        }
      }
    }
  }

  return filtered;
}

// ─── Curriculum Context Cache ───────────────────────────────────────

export interface CachedCurriculumData {
  context: CurriculumContext;
  localFiles: Array<{ file_path: string; content: string }>;
}

const curriculumCache = new Map<string, CachedCurriculumData>();

export function getCachedCurriculumData(projectId: string): CachedCurriculumData | null {
  return curriculumCache.get(projectId) ?? null;
}

export function setCachedCurriculumData(
  projectId: string,
  context: CurriculumContext,
  localFiles: Array<{ file_path: string; content: string }>,
): void {
  curriculumCache.set(projectId, { context, localFiles });
}

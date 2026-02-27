// ─── Knowledge Base Generation Prompt ─────────────────────────────────
// Generates core educational concepts (ConceptHint[]) for a given
// technology. Used to pre-populate the knowledge base so that
// content generation can reference standardized key points and
// quiz topics.

const KB_JSON_SCHEMA = `[
  {
    "concept_key": "string (kebab-case English identifier, e.g. 'app-router')",
    "concept_name": "string (Korean display name, e.g. 'App Router 이해하기')",
    "key_points": ["string (3-5 practical key points in Korean)"],
    "common_quiz_topics": ["string (2-3 good quiz topics in Korean)"],
    "prerequisite_concepts": ["string (concept_key references within this same technology)"],
    "tags": ["string (3-5 searchable tags in English, e.g. 'routing', 'server-components')"]
  }
]`;

/**
 * Build a prompt that instructs the LLM to generate 5-7 core educational
 * concepts (ConceptHint[]) for the given technology.
 */
export function buildKBGenerationPrompt(
  techName: string,
  version?: string | null,
): string {
  const versionLabel = version ? ` v${version}` : "";

  return `You are an expert programming instructor building a knowledge base for a learning platform called VibeUniv.

VibeUniv helps "vibe coders" — people who built working applications using AI coding tools (Claude Code, Cursor, Bolt, etc.) but want to deeply understand the technologies they used.

## Task

Generate 5-7 core educational concepts for **${techName}${versionLabel}**.

These concepts will be used as a knowledge base to guide personalized learning content generation. Each concept should represent a fundamental building block that a vibe coder needs to understand to work confidently with ${techName}.

## Target Audience

- 바이브 코더: AI 코딩 도구로 앱을 만들었지만, 사용한 기술을 깊이 이해하고 싶은 사람들
- 코드가 "왜" 그렇게 작동하는지 이해하고 싶어함
- 실용적이고 프로젝트 기반의 학습을 선호
- 학술적 이론보다 실전 활용에 관심

## Concept Design Guidelines

1. **실용적 관점 우선:** 이론보다는 실제 프로젝트에서 마주치는 개념 위주로 선정하세요.
2. **점진적 난이도:** 기초 개념부터 중급 개념까지 자연스럽게 이어지도록 구성하세요.
3. **의존성 고려:** prerequisite_concepts를 통해 개념 간 학습 순서를 명확히 하세요. 첫 번째 개념은 선행 개념이 없어야 합니다.
4. **바이브 코더 시각:** "이미 동작하는 코드는 있지만 왜 동작하는지 모르는" 사람의 관점에서 개념을 설명하세요.

## Field Requirements

For each concept:

- **concept_key**: kebab-case English identifier (e.g., "app-router", "server-components"). Must be unique within this technology.
- **concept_name**: Korean display name. 친근하고 이해하기 쉬운 제목 (e.g., "App Router 이해하기", "서버 컴포넌트의 비밀").
- **key_points**: 3-5 practical key points in Korean. 각 포인트는 한 문장으로, 바이브 코더가 꼭 알아야 할 핵심 내용을 담으세요. 예시: "App Router는 파일 시스템 기반으로 라우팅을 처리해요", "page.tsx 파일이 곧 하나의 페이지가 돼요".
- **common_quiz_topics**: 2-3 quiz topics in Korean. 이 개념에서 출제하기 좋은 퀴즈 주제를 적으세요. 예시: "layout.tsx와 page.tsx의 차이점", "동적 라우팅에서 params 사용법".
- **prerequisite_concepts**: Array of concept_key strings from THIS SAME list that should be learned first. Use an empty array [] for foundational concepts with no prerequisites.
- **tags**: 3-5 searchable tags in English lowercase (e.g., "routing", "file-system", "pages"). These are used for matching concepts to project files and modules.

## Important Rules

- Write ALL Korean content in a casual, approachable tone (해요체). 부담 없고 가볍게.
- Output ONLY valid JSON matching the schema below. No markdown code fences, no explanation, no preamble.
- Generate exactly 5-7 concepts.
- concept_key must be in kebab-case English.
- concept_name, key_points, and common_quiz_topics must be in Korean.
- tags must be in English lowercase.
- prerequisite_concepts must only reference concept_keys defined in your output.
- Order concepts from foundational to advanced.

## Output JSON Schema

${KB_JSON_SCHEMA}`;
}

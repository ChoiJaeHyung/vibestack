# Phase 4: 멀티 LLM + AI 분석 엔진

사용자가 자신의 LLM API 키를 등록하고, 프로젝트 파일을 AI로 분석하는 시스템을 구현해줘.

## 1. LLM Provider Adapter 구현

### 공통 인터페이스 (`lib/llm/types.ts`)
```typescript
export interface LLMProvider {
  analyze(input: AnalysisInput): Promise<AnalysisOutput>;
  generateLearningPath(input: LearningInput): Promise<LearningOutput>;
  chat(input: ChatInput): Promise<ChatOutput>;
}

export interface AnalysisInput {
  files: Array<{ name: string; content: string; type: string }>;
  techHints: TechHint[];  // 파일 파서에서 추출한 1차 힌트
}

export interface AnalysisOutput {
  technologies: Array<{
    name: string;
    category: string;
    version?: string;
    confidence: number;
    description: string;
    importance: 'core' | 'supporting' | 'dev_dependency';
    relationships?: { depends_on?: string[]; used_with?: string[] };
  }>;
  architecture_summary: string;
  input_tokens: number;
  output_tokens: number;
}
```

### Anthropic 어댑터 (`lib/llm/anthropic.ts`)
- Anthropic SDK (`@anthropic-ai/sdk`) 사용
- 모델: `claude-sonnet-4-20250514` (기본)
- JSON 응답 강제: system prompt에 "Respond only in JSON" 포함

### Google 어댑터 (`lib/llm/google.ts`)
- `@google/generative-ai` SDK 사용
- 모델: `gemini-2.0-flash` (기본)

### OpenAI 호환 어댑터 (`lib/llm/openai-compat.ts`)
- `openai` SDK 사용, `baseURL`만 변경
- 하나의 어댑터로 다음 프로바이더 모두 지원:
  - OpenAI: `https://api.openai.com/v1`
  - Groq: `https://api.groq.com/openai/v1`
  - Mistral: `https://api.mistral.ai/v1`
  - DeepSeek: `https://api.deepseek.com/v1`
  - Together: `https://api.together.xyz/v1`
  - Fireworks: `https://api.fireworks.ai/inference/v1`
  - xAI: `https://api.x.ai/v1`
  - OpenRouter: `https://openrouter.ai/api/v1`

### Cohere 어댑터 (`lib/llm/cohere.ts`)
- `cohere-ai` SDK 사용

### Provider Factory (`lib/llm/factory.ts`)
```typescript
export function createLLMProvider(provider: string, apiKey: string): LLMProvider
```
- provider 문자열로 적절한 어댑터 인스턴스 생성
- 모델 선택은 프로바이더별 기본값 사용 (추후 사용자 선택 가능)

## 2. API 키 암호화/관리

### 설정 페이지 UI (`app/(dashboard)/settings/page.tsx` 확장)
LLM API 키 관리 섹션 추가:
- 프로바이더 선택 드롭다운 (11개 프로바이더 + OpenRouter)
- API 키 입력 필드
- "키 검증" 버튼 → 테스트 API 호출로 유효성 확인
- 저장 시 AES-256-GCM 암호화 후 `user_llm_keys` 테이블에 저장
- 등록된 키 목록 (프로바이더 + 마지막 3자리 힌트만 표시)
- 기본 프로바이더 선택 기능

### 키 검증 로직
각 프로바이더에 간단한 테스트 메시지("Hello")를 보내서 200 응답 확인.
실패 시 에러 메시지 표시.

## 3. 기술 스택 분석 프롬프트

`lib/prompts/tech-analysis.ts`:

```typescript
export function buildAnalysisPrompt(files: ProjectFile[], hints: TechHint[]): string
```

프롬프트 구조:
```
You are a senior software architect analyzing a vibe-coded project.

Given the following project files, identify ALL technologies used.

For each technology, provide:
- name: exact technology name (e.g., "Next.js", not "NextJS")
- category: one of [framework, language, database, auth, deploy, styling, testing, build_tool, library, other]
- version: if detectable from files
- confidence: 0.0 to 1.0
- description: 1-2 sentence explanation of what this tech does in the project
- importance: core | supporting | dev_dependency
- relationships: { depends_on: [...], used_with: [...] }

Pre-detected hints from file analysis:
{hints를 JSON으로}

Project files:
{각 파일의 이름과 내용}

Respond ONLY with a JSON object matching this schema:
{output 스키마}
```

## 4. 분석 플로우 구현

### POST /api/v1/projects/[id]/analyze (Phase 3에서 TODO였던 부분)
1. analysis_jobs 상태를 'processing'으로
2. project_files에서 해당 프로젝트 파일 모두 로드
3. `extractTechHints()` 로 1차 힌트 추출
4. 사용자의 기본 LLM 프로바이더 + 키 로드 (없으면 플랫폼 기본 키)
5. `provider.analyze()` 호출
6. 결과를 `tech_stacks` 테이블에 저장 (upsert)
7. `projects.tech_summary`에 요약 캐시
8. `projects.status`를 'analyzed'로
9. analysis_jobs 상태를 'completed'로 + 토큰/비용 기록
10. 에러 시 'failed' + error_message 기록

### GET /api/v1/projects/[id]/stack
- `tech_stacks` 테이블에서 해당 프로젝트의 기술 스택 반환
- 카테고리별 그룹핑

## 5. 프로젝트 상세 페이지 UI

`app/(dashboard)/projects/[id]/page.tsx` 확장:
- 프로젝트 기본 정보 (이름, 설명, 소스, 상태)
- "분석 시작" 버튼 (status가 'uploaded'일 때 표시)
- 분석 중 로딩 UI
- 분석 완료 후: 기술 스택 카드 그리드
  - 카테고리별 섹션 (Framework, Language, Database 등)
  - 각 기술: 이름, 버전, 신뢰도 바, 중요도 태그, 설명
- 업로드된 파일 목록

## 완료 조건
- 11개 LLM 프로바이더 어댑터 모두 구현
- 사용자가 설정에서 API 키를 등록/검증/삭제 가능
- package.json + tsconfig.json이 포함된 프로젝트를 분석하면 Next.js, TypeScript, React 등이 올바르게 감지됨
- 분석 결과가 DB에 저장되고 API로 조회 가능
- 프로젝트 상세 페이지에서 분석 결과를 시각적으로 확인 가능
- 토큰 사용량이 analysis_jobs에 기록됨
- LLM API 키가 암호화되어 DB에 저장됨

# Phase A: MCP Local-First Refactoring

## Context

현재 MCP 서버의 `vibeuniv_analyze`와 `vibeuniv_ask_tutor`는 서버 측 LLM을 호출하여 사용자 등록 API 키의 크레딧을 소모한다. API 키가 없거나 크레딧이 부족하면 완전히 동작하지 않는다 (최근 Anthropic 크레딧 소진으로 analyze 3회 연속 실패).

**목표**: "서버 = 저장소, 로컬 AI = 두뇌" 패턴을 적용하여 MCP 채널의 서버 LLM 호출을 99.5% 제거한다. `generate_curriculum`이 이미 증명한 패턴(서버에서 데이터 fetch → 로컬 AI에 지침 반환 → 로컬 AI가 생성 → 서버에 submit)을 `analyze`와 `ask_tutor`에도 적용한다.

## 변경 요약

| 작업 | 서버 LLM | 변경 후 |
|------|---------|--------|
| A1: `vibeuniv_analyze` | ~55K tokens/회 | 0 (로컬 AI가 분석) |
| A2: `vibeuniv_ask_tutor` | ~20K tokens/회 | 0 (로컬 AI가 튜터 역할) |
| A3: `generate_curriculum` | 0 (이미 로컬) | API 3회→1회로 통합 |

---

## A1: vibeuniv_analyze → 로컬 분석

### 현재 흐름
```
MCP analyze → POST /analyze → after() { runAnalysis → LLM API 호출 } → 폴링 3초×60회
```
문제: 서버 LLM 의존, 폴링 최대 3분 대기, 사용자 API 키 필수

### 변경 후 흐름
```
MCP analyze → 서버에서 파일 목록/내용 반환 → 로컬 AI가 분석 → MCP submit_tech_stacks → 서버 저장
```

### 변경 파일

**1. `packages/mcp-server/src/types.ts`** — 타입 추가
```typescript
// 프로젝트 상세 (파일 포함)
export interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  files: Array<{
    file_name: string;
    file_path: string;
    content: string;
  }>;
  existingTechStacks: TechStackItem[];
}

// tech stack 제출용
export interface TechStackSubmission {
  technologies: Array<{
    name: string;
    category: string;
    version?: string;
    confidence: number;
    importance: string;
    description?: string;
  }>;
  architecture_summary?: string;
}

export interface TechStackSubmitResult {
  savedCount: number;
  projectStatus: string;
}

// 커리큘럼 컨텍스트 통합
export interface CurriculumContext {
  techStacks: TechStackItem[];
  knowledgeHints: Record<string, ConceptHintItem[]>;
  educationalAnalysis: EducationalAnalysisData | null;
}
```

**2. `packages/mcp-server/src/lib/api-client.ts`** — 메서드 추가
- `getProjectDetail(projectId)`: `GET /projects/{id}/detail` — 파일 내용 포함 프로젝트 상세 반환
- `submitTechStacks(projectId, submission)`: `POST /projects/{id}/tech-stacks` — 분석 결과 저장
- `getCurriculumContext(projectId)`: `GET /projects/{id}/curriculum-context` — 통합 컨텍스트 반환

**3. `app/api/v1/projects/[id]/detail/route.ts`** — **신규 생성**
- GET: 프로젝트 메타데이터 + 파일 내용(복호화) + 기존 tech_stacks 반환
- 인증: API 키 인증 (기존 패턴)
- 파일 내용: `decryptContent()` 적용, 10,000자 제한/파일

**4. `app/api/v1/projects/[id]/tech-stacks/route.ts`** — **신규 생성**
- POST: tech_stacks 테이블에 upsert (기존 analyze/route.ts의 Step 7-9 로직 재사용)
- projects.tech_summary 업데이트, projects.status → 'analyzed'
- LLM 호출 없음 — 순수 DB 저장
- `getDetectedFromSources` 함수는 기존 analyze route에서 추출하여 공유 유틸로 이동: `lib/analysis/tech-stack-utils.ts`

**5. `packages/mcp-server/src/tools/analyze.ts`** — **전면 재작성**
- `client.triggerAnalysis()` + 폴링 제거
- `client.getProjectDetail(project_id)`로 파일 데이터 fetch
- 로컬 AI에게 분석 지침을 반환:
  - 파일별 내용 (분석 대상)
  - 분석 요청 프롬프트 (카테고리, 포맷 지침 등)
  - "분석 완료 후 `vibeuniv_submit_tech_stacks`로 제출하세요" 안내
- 기존 tech stacks가 있으면 참고용으로 포함

**6. `packages/mcp-server/src/tools/submit-tech-stacks.ts`** — **신규 생성**
- `submit-analysis.ts` 패턴을 따르는 companion 제출 도구
- 스키마: `project_id` + `analysis` (TechStackSubmission 형태)
- `client.submitTechStacks(project_id, analysis)` 호출

**7. `packages/mcp-server/src/index.ts`** — 도구 등록
- `registerSubmitTechStacks` import 및 등록 추가
- 도구 수: 9 → 10, 버전: 0.2.0 → 0.3.0

---

## A2: vibeuniv_ask_tutor → 로컬 튜터

### 현재 흐름
```
MCP ask_tutor → POST /tutor → executeTutorChat() → LLM API 호출 → 응답 반환
```

### 변경 후 흐름
```
MCP ask_tutor → 서버에서 프로젝트 컨텍스트 반환 → 로컬 AI가 직접 답변
```

### 변경 파일

**1. `app/api/v1/projects/[id]/tutor-context/route.ts`** — **신규 생성**
- GET: 튜터에 필요한 컨텍스트만 반환 (LLM 호출 없음)
  - tech_stacks (기술명, 카테고리, 설명)
  - project_files (파일명, 내용 — 10개 제한, 6000자/파일 제한, 복호화)
  - learning_context (현재 학습 경로/모듈, 있으면)
- `tutor-chat.ts`의 데이터 로딩 로직 재사용 (lines 44-83)

**2. `packages/mcp-server/src/lib/api-client.ts`** — 메서드 추가
- `getTutorContext(projectId)`: `GET /projects/{id}/tutor-context`

**3. `packages/mcp-server/src/tools/ask-tutor.ts`** — **전면 재작성**
- `client.askTutor()` (서버 LLM 호출) 제거
- `client.getTutorContext(project_id)`로 컨텍스트 fetch
- 로컬 AI에게 튜터 역할 지침 반환:
  - 프로젝트 기술 스택 정보
  - 프로젝트 파일 내용 (코드 기반 답변용)
  - 학습 맥락 (학습 경로 연계)
  - 튜터 페르소나 지침 (`lib/prompts/tutor-chat.ts`에서 핵심 규칙 추출)
  - 사용자 질문

**4. `packages/mcp-server/src/types.ts`** — 타입 추가
```typescript
export interface TutorContext {
  techStacks: Array<{
    technology_name: string;
    category: string;
    description: string | null;
  }>;
  files: Array<{
    file_name: string;
    content: string;
  }>;
  learningContext?: {
    path_title: string;
    current_module: string;
  };
}
```

---

## A3: generate_curriculum API 통합

### 현재: 3회 API 호출
```
1. client.getTechStacks(project_id)         → GET /stack
2. client.getKnowledgeHints(techNames)       → GET /knowledge?techs=...
3. client.getEducationalAnalysis(project_id) → GET /educational-analysis
```

### 변경 후: 1회 API 호출
```
client.getCurriculumContext(project_id) → GET /curriculum-context (3개 통합)
```

### 변경 파일

**1. `app/api/v1/projects/[id]/curriculum-context/route.ts`** — **신규 생성**
- GET: tech_stacks + knowledge_hints + educational_analysis 한 번에 반환
- 서버에서 3개 쿼리 병렬 실행 (Promise.all)
- KB hints: `getKBFromDB()` 재사용 (`server/actions/knowledge.ts`)

**2. `packages/mcp-server/src/lib/api-client.ts`** — 메서드 추가
- `getCurriculumContext(projectId)`: `GET /projects/{id}/curriculum-context`

**3. `packages/mcp-server/src/tools/generate-curriculum.ts`** — 수정
- lines 186-209의 3개 API 호출을 `client.getCurriculumContext(project_id)` 1개로 교체
- 나머지 로직 (프롬프트 빌딩, 포맷팅) 유지

---

## 구현 순서

1. **타입 정의** — `types.ts`에 새 타입 추가
2. **서버 엔드포인트** — 4개 신규 API 라우트 생성
   - `app/api/v1/projects/[id]/detail/route.ts`
   - `app/api/v1/projects/[id]/tech-stacks/route.ts`
   - `app/api/v1/projects/[id]/tutor-context/route.ts`
   - `app/api/v1/projects/[id]/curriculum-context/route.ts`
3. **공유 유틸** — `lib/analysis/tech-stack-utils.ts` (upsert 로직 추출)
4. **API 클라이언트** — `api-client.ts`에 4개 메서드 추가
5. **MCP 도구** — analyze, ask-tutor 재작성 + submit-tech-stacks 신규
6. **index.ts** — 도구 등록 + 버전 0.3.0
7. **generate-curriculum** — 3→1 API 호출 통합

## 기존 코드에서 재사용할 것

| 기존 위치 | 재사용 대상 | 사용처 |
|-----------|-----------|--------|
| `app/api/v1/projects/[id]/analyze/route.ts` lines 214-263 | tech_stacks upsert 로직 | `tech-stacks/route.ts` POST |
| `app/api/v1/projects/[id]/analyze/route.ts` lines 266-276 | tech_summary 빌드 로직 | `tech-stacks/route.ts` POST |
| `server/actions/tutor-chat.ts` lines 44-83 | 파일/스택/학습 컨텍스트 로딩 | `tutor-context/route.ts` GET |
| `lib/prompts/tutor-chat.ts` | 튜터 페르소나 규칙 | `ask-tutor.ts` 지침 빌딩 |
| `lib/utils/content-encryption.ts` `decryptContent()` | 파일 복호화 | `detail/route.ts`, `tutor-context/route.ts` |
| `server/actions/knowledge.ts` `getKBFromDB()` | KB 조회 | `curriculum-context/route.ts` |
| `packages/mcp-server/src/tools/submit-analysis.ts` | 도구 패턴 | `submit-tech-stacks.ts` |

## 검증 방법

1. **빌드 확인**: `cd packages/mcp-server && npm run build` 성공
2. **MCP 도구 테스트**:
   - `vibeuniv_analyze` 호출 → 파일 내용+지침 반환 확인 (서버 LLM 호출 없음)
   - `vibeuniv_submit_tech_stacks` 호출 → DB 저장 확인
   - `vibeuniv_ask_tutor` 호출 → 컨텍스트+지침 반환 확인
   - `vibeuniv_generate_curriculum` 호출 → 1회 API 호출로 동작 확인
3. **DB 확인**: `scripts/check-analysis.mjs`로 tech_stacks 저장 확인
4. **기존 웹 기능**: 웹 대시보드의 analyze/tutor는 변경 없음 (별도 경로)

## 변경하지 않는 것

- 웹 대시보드의 분석/튜터 기능 (기존 서버 LLM 경로 유지)
- 기존 `POST /analyze` 엔드포인트 (웹용으로 유지)
- 기존 `POST /tutor` 엔드포인트 (웹용으로 유지)
- RLS 정책, DB 스키마

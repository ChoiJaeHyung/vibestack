# Phase A: MCP Local-First Refactoring — Claude Code 지시문

## 리뷰 요약

원본 `phase-a-mcp-local-first.md`를 분석한 결과, 전체적으로 잘 구성되어 있으나 Claude Code가 실수 없이 구현하려면 아래 7가지를 보완해야 합니다.

### 보완 포인트

**1. KB 생성 사이드이펙트 처리 누락**
현재 `analyze/route.ts:301`에서 분석 완료 후 `generateMissingKBs()`가 자동 호출됩니다. 로컬 전환 시 이 사이드이펙트가 사라지는데, 지시문에 대응 전략이 없습니다. `tech-stacks/route.ts` POST에서 KB 생성을 트리거할지, 아니면 Phase B에서 처리할지 명시해야 합니다.

**2. `analyze.ts`의 "기존 분석이 있으면 바로 반환" 분기 주의**
원본 감사 보고서의 설계에서는 `techStacks.length > 0`이면 바로 반환하는데, 실제로는 사용자가 코드를 수정한 후 **재분석**을 원할 수 있습니다. `force` 파라미터를 추가하거나, 기존 분석을 참고용으로만 포함하는 것이 안전합니다.

**3. `detail/route.ts`의 파일 크기 제한이 모호**
"10,000자 제한/파일"이라고 했는데, 이 컷은 어디서 잘라야 하는지(앞에서? truncate 표시?), 그리고 파일 수 제한도 필요합니다. 실제 프로젝트의 파일이 100개 이상일 수 있어 MCP 응답 크기가 폭발할 수 있습니다.

**4. `ask-tutor.ts`에서 대화 이력 저장 전략이 빠짐**
원본 감사 보고서에서 방법 A(이력 저장 안 함)와 방법 B(이력 저장)를 제시했는데, 지시문에서 어느 쪽을 선택할지 명시되지 않았습니다.

**5. 에러 핸들링 패턴 미지정**
신규 API 4개에서 프로젝트 미존재, 파일 0개, 인증 실패 등의 에러를 어떻게 처리할지 패턴이 없습니다. 기존 API 라우트의 에러 처리 패턴을 따르라고 명시해야 합니다.

**6. `submit-tech-stacks` 스키마 검증 수준 미지정**
`submit-curriculum`은 Zod 스키마로 엄격히 검증하는데, tech-stacks도 같은 수준이어야 하는지, 아니면 느슨하게 할지 결정이 필요합니다.

**7. 구현 순서에 테스트 단계가 분리되어 있지 않음**
"7단계 구현 후 검증"이 아니라, 각 작업(A1, A2, A3)을 구현할 때마다 빌드 확인을 해야 중간에 깨지지 않습니다.

---

## 개선된 Claude Code 지시문

아래 내용을 그대로 Claude Code에 전달하면 됩니다.

---

# Phase A: MCP Local-First Refactoring

## Context

현재 MCP 서버의 `vibeuniv_analyze`와 `vibeuniv_ask_tutor`는 서버 측 LLM을 호출하여 사용자 등록 API 키의 크레딧을 소모한다. API 키가 없거나 크레딧이 부족하면 완전히 동작하지 않는다 (최근 Anthropic 크레딧 소진으로 analyze 3회 연속 실패).

**목표**: "서버 = 저장소, 로컬 AI = 두뇌" 패턴을 적용하여 MCP 채널의 서버 LLM 호출을 99.5% 제거한다. `generate_curriculum`이 이미 증명한 패턴(서버에서 데이터 fetch → 로컬 AI에 지침 반환 → 로컬 AI가 생성 → 서버에 submit)을 `analyze`와 `ask_tutor`에도 적용한다.

## 핵심 원칙

1. **기존 웹 대시보드 경로는 절대 변경하지 않는다** — `POST /analyze`, `POST /tutor`는 그대로 유지
2. **기존 코드를 최대한 재사용한다** — 새로 작성하기 전에 재사용 테이블의 코드를 먼저 확인
3. **각 작업(A1, A2, A3) 완료 후 반드시 빌드 확인** — `cd packages/mcp-server && npm run build`
4. **에러 핸들링은 기존 API 라우트 패턴을 따른다** — 인증 실패, 프로젝트 미존재, 파일 0개 등

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

**3. `app/api/v1/projects/[id]/detail/route.ts`** — 신규 생성
- GET: 프로젝트 메타데이터 + 파일 내용(복호화) + 기존 tech_stacks 반환
- 인증: API 키 인증 (기존 패턴 따름 — 다른 `[id]` 하위 라우트 참조)
- 파일 내용: `decryptContent()` 적용
- **파일 크기 제한**: 파일당 10,000자에서 truncate, truncate 시 `// ... truncated (원본 {N}자)` 추가
- **파일 수 제한**: 최대 30개 파일까지만 반환. 초과 시 파일 목록(이름+경로)만 별도 필드로 반환
- 에러: 프로젝트 미존재 → 404, 파일 0개 → 빈 배열 반환 (에러 아님)

**4. `app/api/v1/projects/[id]/tech-stacks/route.ts`** — 신규 생성
- POST: tech_stacks 테이블에 upsert
- 기존 `analyze/route.ts`의 Step 7-9 로직(lines 214-276)을 재사용:
  - tech_stacks upsert
  - tech_summary 빌드
  - projects.status → 'analyzed' 업데이트
- **KB 생성**: 저장 완료 후 `generateMissingKBs()` 호출 (기존 analyze/route.ts:301과 동일). 단, `after()` 또는 비동기로 실행하여 응답 지연 없이 처리
- `getDetectedFromSources` 함수는 기존 analyze route에서 추출하여 공유 유틸로 이동: `lib/analysis/tech-stack-utils.ts`
- LLM 호출 없음 — 순수 DB 저장 + KB 생성 트리거
- **스키마 검증**: Zod로 입력 검증. `submit-curriculum`의 검증 패턴을 참조하되, tech-stacks에 맞게 조정:
  - `technologies` 배열 필수, 1개 이상
  - `name`과 `category`는 필수 문자열
  - `confidence`는 0~1 범위
  - `importance`는 `"core" | "primary" | "secondary" | "utility"` enum

**5. `packages/mcp-server/src/tools/analyze.ts`** — 전면 재작성
- `client.triggerAnalysis()` + 폴링 제거
- `client.getProjectDetail(project_id)`로 파일 데이터 fetch
- **재분석 지원**: `force` 파라미터 추가 (기본값 false). 기존 tech stacks가 있으면:
  - `force=false`: 기존 분석 결과를 반환하면서 "재분석하려면 force: true로 호출하세요" 안내
  - `force=true`: 기존 분석을 참고용으로 포함하고 재분석 지시
- 로컬 AI에게 분석 지침을 반환:
  - 파일별 내용 (분석 대상)
  - 분석 요청 프롬프트 (카테고리: framework, language, library, database, tool, platform, styling, testing 중 택1, 포맷 지침 등)
  - "분석 완료 후 `vibeuniv_submit_tech_stacks`로 제출하세요" 안내
  - 기존 tech stacks가 있으면 참고용으로 포함

**6. `packages/mcp-server/src/tools/submit-tech-stacks.ts`** — 신규 생성
- `submit-analysis.ts` 패턴을 따르는 companion 제출 도구
- 스키마: `project_id` (string 필수) + `analysis` (TechStackSubmission 형태)
- `client.submitTechStacks(project_id, analysis)` 호출
- 성공/실패 메시지 반환

**7. `packages/mcp-server/src/index.ts`** — 도구 등록
- `registerSubmitTechStacks` import 및 등록 추가
- 도구 수: 9 → 10
- 버전: package.json의 version을 0.3.0으로 업데이트

### A1 완료 후 확인
```bash
cd packages/mcp-server && npm run build
```
빌드 성공 확인 후 A2로 진행.

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

### 대화 이력 전략: 방법 A (완전 로컬, 이력 저장 안 함)

현재는 방법 A를 선택한다. 이유:
- MCP 채널에서 대화 이력이 로컬 AI의 컨텍스트 윈도우에 이미 유지됨
- 서버에 대화 저장 API를 추가하면 복잡도가 늘어남
- 나중에 이력 저장이 필요해지면 별도 작업으로 추가 가능

### 변경 파일

**1. `app/api/v1/projects/[id]/tutor-context/route.ts`** — 신규 생성
- GET: 튜터에 필요한 컨텍스트만 반환 (LLM 호출 없음)
  - tech_stacks (기술명, 카테고리, 설명)
  - project_files (파일명, 내용)
  - learning_context (현재 학습 경로/모듈, 있으면)
- **파일 제한**: 10개 파일, 6,000자/파일 (기존 `tutor-chat.ts`의 제한과 동일하게 유지)
- 데이터 로딩 로직: `tutor-chat.ts` lines 44-83의 로직을 재사용
- 에러: 프로젝트 미존재 → 404, tech_stacks 없으면 빈 배열

**2. `packages/mcp-server/src/lib/api-client.ts`** — 메서드 추가
- `getTutorContext(projectId)`: `GET /projects/{id}/tutor-context`

**3. `packages/mcp-server/src/tools/ask-tutor.ts`** — 전면 재작성
- `client.askTutor()` (서버 LLM 호출) 제거
- `client.getTutorContext(project_id)`로 컨텍스트 fetch
- 로컬 AI에게 튜터 역할 지침 반환. 반환 내용 구성:

```
[튜터 페르소나 지침]
- lib/prompts/tutor-chat.ts에서 핵심 규칙 추출하여 포함
- 해요체 사용, 코드 인용 시 파일경로:라인 형식, 격려와 칭찬 등

[프로젝트 기술 스택]
- 기술명, 카테고리, 설명

[프로젝트 파일]
- 파일명 + 내용 (코드 기반 답변용)

[학습 컨텍스트] (있으면)
- 현재 학습 경로명, 현재 모듈명

[사용자 질문]
- question 파라미터 그대로 전달
```

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

### A2 완료 후 확인
```bash
cd packages/mcp-server && npm run build
```
빌드 성공 확인 후 A3로 진행.

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

**1. `app/api/v1/projects/[id]/curriculum-context/route.ts`** — 신규 생성
- GET: tech_stacks + knowledge_hints + educational_analysis 한 번에 반환
- 서버에서 3개 쿼리 병렬 실행 (`Promise.all`)
- KB hints: `getKBFromDB()` 재사용 (`server/actions/knowledge.ts`)
- 응답 형태:
```typescript
{
  techStacks: TechStackItem[],
  knowledgeHints: Record<string, ConceptHintItem[]>,
  educationalAnalysis: EducationalAnalysisData | null
}
```

**2. `packages/mcp-server/src/lib/api-client.ts`** — 메서드 추가
- `getCurriculumContext(projectId)`: `GET /projects/{id}/curriculum-context`

**3. `packages/mcp-server/src/tools/generate-curriculum.ts`** — 수정
- lines 186-209의 3개 API 호출을 `client.getCurriculumContext(project_id)` 1개로 교체
- 나머지 로직 (프롬프트 빌딩, 포맷팅) 유지
- **주의**: 기존 `getTechStacks()`에서 반환하는 형태와 통합 API의 `techStacks` 필드 형태가 동일한지 확인. 다르면 매핑 추가

### A3 완료 후 확인
```bash
cd packages/mcp-server && npm run build
```

---

## 구현 순서 (작업별 빌드 확인 포함)

```
1. types.ts — 새 타입 추가 (ProjectDetail, TechStackSubmission, TutorContext, CurriculumContext)

--- A1 시작 ---
2. lib/analysis/tech-stack-utils.ts — analyze/route.ts에서 upsert 로직 추출
3. app/api/v1/projects/[id]/detail/route.ts — 신규 API
4. app/api/v1/projects/[id]/tech-stacks/route.ts — 신규 API
5. api-client.ts — getProjectDetail(), submitTechStacks() 추가
6. tools/analyze.ts — 재작성
7. tools/submit-tech-stacks.ts — 신규
8. index.ts — 도구 등록
9. ✅ 빌드 확인: cd packages/mcp-server && npm run build

--- A2 시작 ---
10. app/api/v1/projects/[id]/tutor-context/route.ts — 신규 API
11. api-client.ts — getTutorContext() 추가
12. tools/ask-tutor.ts — 재작성
13. ✅ 빌드 확인: cd packages/mcp-server && npm run build

--- A3 시작 ---
14. app/api/v1/projects/[id]/curriculum-context/route.ts — 신규 API
15. api-client.ts — getCurriculumContext() 추가
16. tools/generate-curriculum.ts — 수정
17. ✅ 빌드 확인: cd packages/mcp-server && npm run build

--- 마무리 ---
18. package.json version → 0.3.0
```

## 기존 코드에서 재사용할 것

| 기존 위치 | 재사용 대상 | 사용처 |
|-----------|-----------|--------|
| `app/api/v1/projects/[id]/analyze/route.ts` lines 214-263 | tech_stacks upsert 로직 | `tech-stacks/route.ts` POST |
| `app/api/v1/projects/[id]/analyze/route.ts` lines 266-276 | tech_summary 빌드 로직 | `tech-stacks/route.ts` POST |
| `app/api/v1/projects/[id]/analyze/route.ts` line 301 | `generateMissingKBs()` 호출 | `tech-stacks/route.ts` POST (after() 내부) |
| `server/actions/tutor-chat.ts` lines 44-83 | 파일/스택/학습 컨텍스트 로딩 | `tutor-context/route.ts` GET |
| `lib/prompts/tutor-chat.ts` | 튜터 페르소나 규칙 | `ask-tutor.ts` 지침 빌딩 |
| `lib/utils/content-encryption.ts` `decryptContent()` | 파일 복호화 | `detail/route.ts`, `tutor-context/route.ts` |
| `server/actions/knowledge.ts` `getKBFromDB()` | KB 조회 | `curriculum-context/route.ts` |
| `packages/mcp-server/src/tools/submit-analysis.ts` | 도구 등록 패턴 | `submit-tech-stacks.ts` |

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
- `submit_analysis`, `submit_curriculum`, `generate_curriculum`의 기존 동작 (A3는 API 호출 수만 변경)

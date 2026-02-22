# Phase 5: 학습 시스템

분석된 기술 스택을 기반으로 맞춤 학습 로드맵을 생성하고, AI 튜터와 대화형 학습을 할 수 있는 시스템을 구현해줘.

## 1. 학습 로드맵 생성

### 프롬프트 설계 (`lib/prompts/learning-roadmap.ts`)

```typescript
export function buildRoadmapPrompt(
  techStacks: TechStack[],
  userLevel?: 'beginner' | 'intermediate' | 'advanced'
): string
```

프롬프트 구조:
```
You are an expert programming instructor creating a personalized learning roadmap for a "vibe coder" — someone who built a working project with AI tools but wants to understand the underlying technologies.

The student's project uses these technologies:
{techStacks를 JSON으로}

Create a structured learning path with these rules:
1. Start with the MOST IMPORTANT technology first (core framework)
2. Order by dependency: learn prerequisites before dependents
3. For each technology, create 3-7 learning modules
4. Each module should be completable in 15-45 minutes
5. Mix theory (concept) with practice (practical, quiz, project_walkthrough)
6. Reference the student's ACTUAL PROJECT as examples wherever possible

For each module, provide:
- title: clear, concise module title
- description: what the student will learn
- module_type: concept | practical | quiz | project_walkthrough
- estimated_minutes: 15-45
- content: {
    sections: [
      {
        type: "explanation" | "code_example" | "quiz_question" | "challenge",
        title: string,
        body: string (markdown format),
        code?: string (if applicable),
        quiz_options?: string[] (if quiz),
        quiz_answer?: number (0-indexed, if quiz)
      }
    ]
  }

Respond ONLY with JSON matching this schema:
{
  title: string,
  description: string,
  difficulty: "beginner" | "intermediate" | "advanced",
  estimated_hours: number,
  modules: [{ title, description, module_type, estimated_minutes, content, tech_name }]
}
```

### 생성 API

#### POST /api/v1/learning/generate
```typescript
// Request
{
  project_id: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}
// Response: { success: true, data: { learning_path_id, title, total_modules } }
```

구현 플로우:
1. 프로젝트의 tech_stacks 로드
2. 사용자의 기본 LLM 프로바이더 + 키 로드
3. `provider.generateLearningPath()` 호출
4. 결과를 `learning_paths` + `learning_modules` 테이블에 저장
5. 각 모듈의 `tech_stack_id`를 해당 기술과 연결
6. `learning_paths.total_modules` 업데이트

#### GET /api/v1/learning/paths?project_id={id}
- 해당 프로젝트의 학습 경로 목록 반환

#### GET /api/v1/learning/paths/[id]
- 학습 경로 상세 + 모듈 목록 + 각 모듈의 진행 상태 반환

#### GET /api/v1/learning/modules/[id]
- 개별 모듈의 전체 콘텐츠 반환

## 2. 학습 진행 추적

#### POST /api/v1/learning/progress
```typescript
// Request
{
  module_id: string;
  status: 'in_progress' | 'completed' | 'skipped';
  score?: number;        // 퀴즈 점수 (0-100)
  time_spent?: number;   // 초 단위
}
```

구현:
- `learning_progress` 테이블에 upsert
- status가 'completed'이면 completed_at 기록
- attempts 카운트 증가
- 학습 경로의 전체 진행률 계산 로직

## 3. AI 튜터 채팅

### 프롬프트 설계 (`lib/prompts/tutor-chat.ts`)

```typescript
export function buildTutorPrompt(
  projectFiles: ProjectFile[],
  techStacks: TechStack[],
  learningContext?: { path_title: string; current_module: string },
  conversationHistory: Message[]
): string
```

프롬프트 구조:
```
You are a friendly, patient AI tutor helping a vibe coder understand their project.

The student built this project using AI tools and wants to understand how it works.

Project tech stack:
{techStacks 요약}

Relevant project files:
{projectFiles 중 질문과 관련된 파일들}

{learningContext가 있으면:}
The student is currently studying: {current_module} in the learning path "{path_title}"

Rules:
1. ALWAYS use the student's actual project code as examples
2. Explain concepts simply, avoid jargon or explain it when used
3. Use analogies when helpful
4. If the student asks about code they don't understand, walk through it line-by-line
5. Encourage curiosity, never be condescending
6. Keep responses focused and concise (under 500 words unless detailed explanation needed)
7. When explaining a concept, show how it appears in THEIR code
```

### 채팅 API

#### POST /api/v1/learning/chat
```typescript
// Request
{
  project_id: string;
  conversation_id?: string;   // 기존 대화 이어가기
  message: string;
  learning_path_id?: string;  // 학습 모듈 컨텍스트
}
// Response
{
  success: true,
  data: {
    conversation_id: string;
    response: string;
    tokens_used: number;
  }
}
```

구현 플로우:
1. conversation_id가 있으면 기존 대화 히스토리 로드
2. 프로젝트 파일 + 기술 스택을 컨텍스트로 조립
3. 사용자의 LLM 프로바이더로 채팅 요청
4. 응답을 `ai_conversations.messages`에 추가 저장
5. 토큰 사용량 누적

#### GET /api/v1/learning/chat/[conversation_id]
- 대화 히스토리 반환

## 4. 학습 페이지 UI

### 학습 목록 (`app/(dashboard)/learning/page.tsx`)
- 프로젝트별 학습 경로 카드
- 각 카드: 제목, 설명, 난이도, 진행률 프로그레스 바, 예상 시간
- "새 로드맵 생성" 버튼 (프로젝트 선택 → 생성)

### 학습 경로 상세 (`app/(dashboard)/learning/[pathId]/page.tsx`)
- 학습 경로 타이틀 + 전체 진행률
- 모듈 목록 (순서대로, 체크마크로 완료 표시)
- 현재 학습 중인 모듈 하이라이트
- 각 모듈 클릭 시 모듈 상세로 이동

### 학습 모듈 상세 (`app/(dashboard)/learning/[pathId]/[moduleId]/page.tsx`)
- 모듈 콘텐츠 렌더링:
  - `explanation` 섹션: Markdown 렌더링 (react-markdown 사용)
  - `code_example` 섹션: 코드 하이라이트 (highlight.js 또는 prism)
  - `quiz_question` 섹션: 라디오 버튼 선택 → 정답 확인
  - `challenge` 섹션: 설명 + "완료" 체크
- 하단: "완료" 버튼, "다음 모듈" 버튼
- 오른쪽 사이드: AI 튜터 채팅 패널 (이 모듈 컨텍스트로)

### AI 튜터 채팅 (`components/features/tutor-chat.tsx`)
- 채팅 UI: 메시지 버블 형태
- 입력창 + 전송 버튼
- 스트리밍 응답 표시 (가능하면)
- 프로젝트/학습 경로 컨텍스트 자동 포함
- 대화 히스토리 유지

## 5. 과금 제한 로직

`lib/utils/usage-limits.ts`:
```typescript
export async function checkUsageLimit(userId: string, action: 'analysis' | 'learning' | 'chat'): Promise<{
  allowed: boolean;
  remaining?: number;
  limit?: number;
  upgrade_message?: string;
}>
```

Free 티어 제한:
- 프로젝트: 3개
- 학습 로드맵: 월 1회
- AI 튜터 대화: 월 20회

제한 초과 시 Pro 업그레이드 안내 UI.

## 완료 조건
- 분석된 프로젝트에서 "학습 로드맵 생성" → 모듈들이 올바르게 생성됨
- 모듈 콘텐츠가 Markdown으로 렌더링됨 (코드 하이라이트 포함)
- 퀴즈 모듈에서 정답 확인 가능
- 학습 진행률이 추적되고 UI에 반영됨
- AI 튜터와 대화 가능 (프로젝트 코드를 참조하는 답변)
- 대화 히스토리가 저장되고 이어서 대화 가능
- Free 티어 사용량 제한이 동작함

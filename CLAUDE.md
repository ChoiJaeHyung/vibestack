# CLAUDE.md — VibeStack 프로젝트 컨텍스트

## 프로젝트 개요
VibeStack은 바이브 코더(Vibe Coder)들이 AI로 만든 프로젝트의 기술 스택을 이해하고 학습할 수 있도록 돕는 플랫폼이다.

**핵심 가치:** "먼저 만들고, 그 다음에 이해한다"
- 바이브 코더가 코딩 도구(Claude Code, Cursor, Bolt 등)로 앱을 만든다
- VibeStack MCP 서버를 통해 프로젝트 데이터를 자동 수집한다
- AI가 기술 스택을 분석하고 맞춤 학습 로드맵을 생성한다
- AI 튜터와 함께 실제 프로젝트 기반으로 학습한다

## 기술 스택 (절대 변경 금지)
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Multi-LLM (Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek 등)
- **MCP:** @modelcontextprotocol/sdk (TypeScript)
- **Deploy:** Vercel
- **Payments:** Stripe

## 코딩 컨벤션

### 파일/폴더 구조
```
vibestack/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # 인증 관련 페이지 그룹
│   ├── (dashboard)/        # 대시보드 페이지 그룹
│   ├── api/                # API Routes
│   │   └── v1/             # 외부 API (MCP/CLI용)
│   └── layout.tsx
├── components/
│   ├── ui/                 # 재사용 가능한 UI 컴포넌트
│   └── features/           # 기능별 컴포넌트
├── lib/
│   ├── supabase/           # Supabase 클라이언트 (server.ts, client.ts)
│   ├── llm/                # LLM Provider Adapter
│   │   ├── types.ts        # 공통 인터페이스
│   │   ├── anthropic.ts
│   │   ├── google.ts
│   │   └── openai-compat.ts  # Groq,Mistral,DeepSeek 등 통합
│   ├── analysis/           # 기술 스택 분석 로직
│   ├── learning/           # 학습 로드맵 생성 로직
│   └── utils/              # 유틸리티 함수
├── server/
│   ├── actions/            # Server Actions
│   └── middleware/         # API 미들웨어 (인증 등)
├── types/                  # TypeScript 타입 정의
├── packages/
│   └── mcp-server/         # @vibestack/mcp-server (npm 패키지)
└── supabase/
    └── migrations/         # DB 마이그레이션 SQL
```

### TypeScript 규칙
- strict mode 필수
- `any` 타입 사용 금지, 반드시 타입 정의할 것
- 비동기 함수는 항상 `async/await` 사용
- 에러 처리는 `try/catch`로 명시적으로 할 것
- 모든 API 응답은 타입 정의할 것

### 네이밍 규칙
- 파일명: kebab-case (`tech-stack-analyzer.ts`)
- 컴포넌트: PascalCase (`TechStackCard.tsx`)
- 함수/변수: camelCase (`analyzeTechStack`)
- 상수: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- DB 테이블/컬럼: snake_case (`tech_stacks`, `user_id`)
- API 엔드포인트: kebab-case (`/api/v1/projects`)
- MCP Tool 이름: snake_case with prefix (`vibestack_sync_project`)

### 컴포넌트 규칙
- Server Component를 기본으로 사용
- 클라이언트 상태가 필요한 경우에만 `'use client'` 사용
- UI 컴포넌트는 Tailwind CSS만 사용 (CSS 파일 별도 생성 금지)
- 아이콘은 lucide-react 사용

### API 규칙
- 외부 API (/api/v1/*): API 키 인증 필수
- 내부 API: Supabase Auth 세션 기반
- 응답 형식: `{ success: boolean, data?: T, error?: string }`
- 에러 시 적절한 HTTP 상태코드 반환

### DB 규칙
- Supabase JS 클라이언트 사용 (직접 SQL 금지, 마이그레이션 파일 제외)
- RLS(Row Level Security) 모든 테이블에 적용
- UUID를 PK로 사용
- created_at, updated_at 모든 테이블에 포함

### LLM 규칙
- 직접 API 호출 금지 — 반드시 lib/llm/ 의 Provider Adapter를 통해 호출
- 사용자 API 키는 AES-256-GCM으로 암호화하여 DB 저장
- 프롬프트는 별도 파일로 관리 (`lib/prompts/`)
- 토큰 사용량 추적 필수 (analysis_jobs 테이블)

### 환경변수 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=                 # API 키 암호화용 (32바이트)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

## 비즈니스 로직 요약

### 데이터 수집 채널 (우선순위)
1. **MCP Server** (메인): Claude Code, Cursor, Windsurf 등에서 자동 연결
2. **REST API**: 웹 기반 도구에서 Webhook으로 전송
3. **CLI/웹 업로드**: 수동 전송 폴백

### 핵심 플로우
1. 프로젝트 수집 → 파일 파싱 → AI 기술 스택 분석 → 결과 저장
2. 사용자 요청 → AI 학습 로드맵 생성 → 모듈별 콘텐츠 생성
3. AI 튜터 대화 (프로젝트 코드를 컨텍스트로 활용)

### 과금 모델
- Free: 3 프로젝트, 기본 분석, 월 20회 AI 대화
- Pro ($19/mo): 무제한, 심화 분석, BYOK(자체 LLM 키)
- Team ($49/mo): Pro + 팀 공유 + 우선순위

## 현재 진행 상황
- [ ] Phase 1: 프로젝트 초기 설정
- [ ] Phase 2: MCP 서버 개발
- [ ] Phase 3: 프로젝트 수집 + 파일 파싱
- [ ] Phase 4: 멀티 LLM + AI 분석 엔진
- [ ] Phase 5: 학습 시스템
- [ ] Phase 6: 대시보드 + 결제 + 출시

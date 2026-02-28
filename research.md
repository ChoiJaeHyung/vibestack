# research.md — VibeUniv 프로젝트 상세 분석 문서

> 이 문서는 VibeUniv 프로젝트의 DB 스키마, 디렉토리 구조, 비즈니스 로직, 데이터 플로우를 상세 기술한다.
> CLAUDE.md의 간결한 지침과 달리, 이 문서는 구현 레퍼런스로 활용된다.

---

## 1. 디렉토리 구조 (상세)

```
vibeuniv/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # 루트 레이아웃 (ThemeProvider, AuthStateListener)
│   ├── page.tsx                      # 랜딩 페이지
│   ├── guide/page.tsx                # 공개 가이드 (MCP 설정 등)
│   ├── robots.ts                     # SEO robots.txt
│   ├── sitemap.ts                    # SEO sitemap
│   ├── manifest.ts                   # PWA manifest
│   │
│   ├── (auth)/                       # 인증 페이지 그룹
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts         # OAuth 콜백
│   │
│   ├── (dashboard)/                  # 보호된 대시보드 그룹
│   │   ├── layout.tsx                # Sidebar + main layout
│   │   ├── dashboard/page.tsx        # 메인 대시보드
│   │   ├── projects/
│   │   │   ├── page.tsx              # 프로젝트 목록
│   │   │   └── [id]/page.tsx         # 프로젝트 상세 (분석 결과)
│   │   ├── learning/
│   │   │   ├── page.tsx              # 학습 경로 목록
│   │   │   └── [pathId]/
│   │   │       ├── page.tsx          # 학습 경로 상세
│   │   │       └── [moduleId]/page.tsx  # 모듈 학습 화면
│   │   └── settings/
│   │       ├── page.tsx              # 사용자 설정
│   │       └── billing/page.tsx      # 구독/결제 관리
│   │
│   ├── (admin)/                      # 어드민 페이지 그룹
│   │   └── admin/
│   │       ├── page.tsx              # 어드민 대시보드
│   │       ├── users/
│   │       │   ├── page.tsx          # 사용자 관리
│   │       │   └── [id]/page.tsx     # 사용자 상세
│   │       ├── subscriptions/page.tsx
│   │       ├── content/page.tsx
│   │       ├── audit-log/page.tsx
│   │       └── settings/
│   │           ├── page.tsx
│   │           └── announcements/page.tsx
│   │
│   └── api/                          # API Routes
│       ├── auth/signout/route.ts
│       ├── dashboard/route.ts        # GET: 대시보드 데이터 (세션)
│       ├── projects-list/route.ts    # GET: 프로젝트 목록 (세션)
│       ├── learning-paths/route.ts   # GET: 학습 경로 목록 (세션)
│       ├── usage/route.ts            # GET: 사용량 (세션)
│       │
│       ├── payments/                 # 토스페이먼츠
│       │   ├── subscribe/route.ts    # POST: 구독 시작
│       │   ├── confirm/route.ts      # POST: 결제 확인
│       │   ├── cancel/route.ts       # POST: 구독 해지
│       │   ├── billing-key/route.ts  # POST: 빌링키 저장
│       │   └── webhook/route.ts      # POST: 결제 웹훅
│       │
│       └── v1/                       # 외부 API (API 키 인증)
│           ├── health/route.ts
│           ├── knowledge/route.ts
│           ├── projects/
│           │   ├── route.ts                         # POST/GET: 프로젝트 CRUD
│           │   └── [id]/
│           │       ├── route.ts                     # GET/DELETE
│           │       ├── files/route.ts               # POST/GET: 파일 업로드
│           │       ├── analyze/
│           │       │   ├── route.ts                 # POST: 분석 시작
│           │       │   └── [jobId]/route.ts         # GET: 분석 상태 폴링
│           │       ├── stack/route.ts               # GET: 기술 스택 조회
│           │       ├── detail/route.ts              # GET: 프로젝트 상세 (파일 포함, 로컬 분석용)
│           │       ├── tech-stacks/route.ts         # POST: 로컬 분석 결과 저장
│           │       ├── tutor-context/route.ts       # GET: 튜터 컨텍스트 (로컬 튜터용)
│           │       ├── curriculum-context/route.ts  # GET: 커리큘럼 통합 컨텍스트
│           │       ├── curriculum/route.ts           # GET: 커리큘럼 상태
│           │       ├── educational-analysis/route.ts # POST/GET: 교육 분석
│           │       └── learning/route.ts            # GET: 학습 상태
│           └── learning/
│               ├── paths/
│               │   ├── route.ts                     # GET: 경로 목록
│               │   └── [id]/route.ts                # GET: 경로 상세
│               ├── generate/route.ts                # POST: 학습 생성
│               ├── chat/
│               │   ├── route.ts                     # POST: AI 튜터 채팅
│               │   └── [conversationId]/route.ts    # GET: 대화 조회
│               ├── modules/[id]/route.ts            # GET: 모듈 상세
│               └── progress/route.ts                # GET: 학습 진행률
│
├── components/
│   ├── ui/                           # 재사용 UI
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── loading.tsx
│   │   ├── sidebar.tsx
│   │   └── theme-provider.tsx
│   └── features/                     # 기능 컴포넌트
│       ├── dashboard-content.tsx      # 대시보드 (통계, 차트, 최근 프로젝트)
│       ├── projects-content.tsx       # 프로젝트 목록 + 관리
│       ├── project-analysis.tsx       # 기술 스택 분석 결과 표시
│       ├── project-card.tsx           # 프로젝트 카드
│       ├── delete-project-button.tsx  # 삭제 확인 포함
│       ├── tech-stack-badge.tsx       # 기술 배지
│       ├── tech-chart.tsx             # Recharts 기술 분포 차트
│       ├── learning-content.tsx       # 학습 경로 목록
│       ├── learning-path-card.tsx     # 학습 카드
│       ├── learning-generator.tsx     # 학습 경로 생성 UI
│       ├── module-content.tsx         # 모듈 학습 (섹션 렌더링)
│       ├── tutor-chat.tsx             # AI 튜터 채팅 인터페이스
│       ├── billing-manager.tsx        # 구독 관리
│       ├── payment-confirm.tsx        # 결제 확인 (토스)
│       ├── upgrade-modal.tsx          # 업그레이드 모달
│       ├── dashboard-upgrade-banner.tsx
│       ├── api-key-manager.tsx        # API 키 생성/관리
│       ├── llm-key-manager.tsx        # LLM 키 암호화 저장
│       ├── usage-progress.tsx         # 사용량 프로그레스 바
│       ├── announcement-banner.tsx    # 공지사항 배너
│       ├── auth-state-listener.tsx    # 인증 상태 추적
│       └── admin-*.tsx                # 어드민 컴포넌트 (6종)
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # createClient() - 서버 쿠키 기반
│   │   ├── client.ts                 # createBrowserClient() - 브라우저
│   │   ├── service.ts                # createServiceClient() - service_role
│   │   ├── auth.ts                   # getUser() 헬퍼
│   │   └── middleware.ts             # updateSession() - 세션 갱신
│   │
│   ├── llm/                          # Multi-LLM Adapter
│   │   ├── types.ts                  # LLMProvider 인터페이스
│   │   ├── factory.ts                # createLLMProvider() 팩토리
│   │   ├── anthropic.ts              # AnthropicProvider
│   │   ├── google.ts                 # GoogleProvider
│   │   ├── openai-compat.ts          # OpenAI 호환 (8개 프로바이더)
│   │   ├── cohere.ts                 # CohereProvider
│   │   └── parse-analysis.ts         # LLM 응답 JSON 파싱/검증
│   │
│   ├── analysis/
│   │   ├── file-parser.ts            # 파일 파싱 (package.json, tsconfig 등)
│   │   ├── digest-generator.ts       # 기술 스택 요약 생성
│   │   └── tech-stack-utils.ts       # tech_stacks upsert 공유 유틸
│   │
│   ├── learning/
│   │   └── project-digest.ts         # 학습용 프로젝트 다이제스트
│   │
│   ├── knowledge/
│   │   ├── index.ts                  # 3-tier KB 조회 (캐시→DB→시드)
│   │   ├── types.ts                  # TechKnowledge, ConceptHint 타입
│   │   └── data/                     # 시드 데이터
│   │       ├── nextjs.ts
│   │       ├── react.ts
│   │       ├── typescript.ts
│   │       ├── supabase.ts
│   │       └── tailwind.ts
│   │
│   ├── prompts/                      # LLM 프롬프트 템플릿
│   │   ├── tech-analysis.ts          # buildAnalysisPrompt(), buildDigestAnalysisPrompt()
│   │   ├── learning-roadmap.ts       # buildStructurePrompt(), buildContentBatchPrompt()
│   │   ├── tutor-chat.ts             # buildTutorPrompt()
│   │   └── knowledge-generation.ts   # buildKBGenerationPrompt()
│   │
│   ├── utils/
│   │   ├── encryption.ts             # AES-256-GCM 암/복호화
│   │   ├── content-encryption.ts     # 사용자 키 복호화 헬퍼
│   │   ├── api-response.ts           # 표준 API 응답 헬퍼
│   │   ├── rate-limit.ts             # 인메모리 레이트 리미터
│   │   ├── usage-limits.ts           # 플랜별 사용량 체크
│   │   ├── constants.ts
│   │   ├── system-settings.ts        # 시스템 설정 조회
│   │   ├── user-role.ts              # 역할 확인
│   │   ├── ban-check.ts              # 밴 상태 확인
│   │   └── llm-key-errors.ts         # LLM 키 에러 메시지
│   │
│   └── hooks/
│       └── use-cached-fetch.ts       # SWR 스타일 캐시드 페치
│
├── server/
│   ├── actions/                      # Server Actions ("use server")
│   │   ├── projects.ts               # 프로젝트 CRUD + 분석 실행
│   │   ├── learning.ts               # 학습 경로 생성 (2-Phase)
│   │   ├── tutor-chat.ts             # AI 튜터 대화
│   │   ├── api-keys.ts               # API 키 생성/삭제
│   │   ├── llm-keys.ts               # LLM 키 암호화 저장/조회
│   │   ├── knowledge.ts              # KB 생성/조회
│   │   ├── usage.ts                  # 사용량 추적
│   │   ├── billing.ts                # 토스페이먼츠 결제
│   │   ├── dashboard.ts              # 대시보드 RPC
│   │   └── admin.ts                  # 어드민 작업
│   └── middleware/
│       ├── api-auth.ts               # API 키 인증 미들웨어
│       └── admin-auth.ts             # 어드민 역할 확인
│
├── types/
│   ├── database.ts                   # Supabase DB 타입 (전체 스키마)
│   ├── api.ts                        # API 요청/응답 타입
│   └── educational-analysis.ts       # 교육 분석 데이터 구조
│
├── packages/
│   └── mcp-server/                   # @vibeuniv/mcp-server (npm)
│       ├── package.json
│       └── src/
│           ├── index.ts              # MCP 서버 엔트리 (10개 툴 등록)
│           ├── types.ts
│           ├── lib/
│           │   ├── api-client.ts     # VibeUniv REST API 클라이언트
│           │   ├── config.ts         # 설정 로더
│           │   └── file-scanner.ts   # 프로젝트 파일 스캐너
│           └── tools/                # MCP 도구 구현
│               ├── sync-project.ts         # vibeuniv_sync_project
│               ├── upload-files.ts         # vibeuniv_upload_files
│               ├── analyze.ts              # vibeuniv_analyze (로컬 분석 패턴)
│               ├── submit-tech-stacks.ts   # vibeuniv_submit_tech_stacks
│               ├── get-learning.ts         # vibeuniv_get_learning
│               ├── ask-tutor.ts            # vibeuniv_ask_tutor (로컬 튜터 패턴)
│               ├── log-session.ts          # vibeuniv_log_session
│               ├── submit-analysis.ts      # vibeuniv_submit_analysis
│               ├── generate-curriculum.ts  # vibeuniv_generate_curriculum
│               └── submit-curriculum.ts    # vibeuniv_submit_curriculum
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql          # 핵심 테이블 12개
│       ├── 002_cascade_delete_*.sql        # FK CASCADE 수정
│       ├── 003_admin_system.sql            # 어드민 시스템
│       ├── 004_educational_analysis.sql    # 교육 분석 테이블
│       ├── 005_dashboard_rpc.sql           # get_dashboard_data() RPC
│       ├── 006_toss_payments.sql           # 토스페이먼츠 결제
│       └── 007_technology_knowledge.sql    # 기술 KB + 시드 데이터
│
├── scripts/                          # 유틸리티 스크립트
├── middleware.ts                      # Next.js 미들웨어 (세션+레이트리밋)
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

---

## 2. 데이터베이스 스키마

### 2.1 테이블 목록 (18개)

| # | 테이블 | 설명 | 마이그레이션 |
|---|--------|------|-------------|
| 1 | `users` | 사용자 프로필 (auth.users 확장) | 001 |
| 2 | `user_api_keys` | MCP/CLI 인증용 API 키 | 001 |
| 3 | `user_llm_keys` | 암호화된 LLM API 키 (BYOK) | 001 |
| 4 | `projects` | 사용자 프로젝트 | 001 |
| 5 | `project_files` | 프로젝트 소스 파일 | 001 |
| 6 | `tech_stacks` | 감지된 기술 스택 | 001 |
| 7 | `analysis_jobs` | 분석 작업 추적 | 001 |
| 8 | `learning_paths` | 학습 커리큘럼 | 001 |
| 9 | `learning_modules` | 학습 모듈 (레슨) | 001 |
| 10 | `learning_progress` | 학습 진행 추적 | 001 |
| 11 | `ai_conversations` | AI 튜터 대화 | 001 |
| 12 | `mcp_sessions` | MCP 세션 로그 | 001 |
| 13 | `system_settings` | 시스템 설정 | 003 |
| 14 | `announcements` | 공지사항 | 003 |
| 15 | `admin_audit_log` | 어드민 감사 로그 | 003 |
| 16 | `educational_analyses` | 교육 분석 데이터 | 004 |
| 17 | `payments` | 결제 내역 (토스) | 006 |
| 18 | `technology_knowledge` | 기술 KB (시드+LLM) | 007 |

### 2.2 핵심 테이블 상세

#### users
```sql
id              UUID PK (→ auth.users)
email           TEXT UNIQUE NOT NULL
name            TEXT
avatar_url      TEXT
plan_type       TEXT DEFAULT 'free' CHECK ('free','pro','team')
plan_expires_at TIMESTAMPTZ
toss_customer_key TEXT        -- 토스 고객 키
toss_billing_key  TEXT        -- 토스 빌링 키
role            TEXT DEFAULT 'user' CHECK ('user','admin','super_admin')
is_banned       BOOLEAN DEFAULT false
banned_at       TIMESTAMPTZ
ban_reason      TEXT
onboarding_completed BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

#### projects
```sql
id              UUID PK
user_id         UUID FK → users ON DELETE CASCADE
name            TEXT NOT NULL
description     TEXT
source_platform TEXT           -- "claude-code", "cursor" 등
source_channel  TEXT CHECK ('mcp','api','cli','web_upload')
status          TEXT DEFAULT 'created' CHECK ('created','uploaded','analyzing','analyzed','error')
last_synced_at  TIMESTAMPTZ
tech_summary    JSONB          -- 빠른 기술 요약
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

#### project_files
```sql
id              UUID PK
project_id      UUID FK → projects ON DELETE CASCADE
file_name       TEXT NOT NULL   -- "package.json"
file_type       TEXT NOT NULL CHECK ('dependency','ai_config','build_config','source_code','other')
file_path       TEXT           -- 상대 경로
storage_url     TEXT
raw_content     TEXT           -- 파일 내용
file_size       INTEGER
content_hash    TEXT           -- SHA-256 중복 방지
created_at      TIMESTAMPTZ DEFAULT now()
```

#### tech_stacks
```sql
id                UUID PK
project_id        UUID FK → projects ON DELETE CASCADE
technology_name   TEXT NOT NULL
category          TEXT NOT NULL CHECK ('framework','language','database','auth','deploy','styling','testing','build_tool','library','other')
subcategory       TEXT
version           TEXT
confidence_score  DECIMAL(3,2) DEFAULT 0.50  -- 0.0~1.0
detected_from     TEXT[]       -- 감지된 파일명 배열
description       TEXT
importance        TEXT DEFAULT 'core' CHECK ('core','supporting','dev_dependency')
relationships     JSONB        -- { depends_on: [], used_with: [] }
UNIQUE(project_id, technology_name)
```

#### learning_paths
```sql
id              UUID PK
project_id      UUID FK → projects ON DELETE CASCADE
user_id         UUID FK → users ON DELETE CASCADE
title           TEXT NOT NULL
description     TEXT
difficulty      TEXT CHECK ('beginner','intermediate','advanced')
estimated_hours DECIMAL(5,1)
total_modules   INTEGER DEFAULT 0
llm_provider    TEXT
status          TEXT DEFAULT 'draft' CHECK ('draft','active','completed','archived')
```

#### learning_modules
```sql
id                UUID PK
learning_path_id  UUID FK → learning_paths ON DELETE CASCADE
title             TEXT NOT NULL
description       TEXT
content           JSONB NOT NULL DEFAULT '{}'  -- { sections: [...] }
module_order      INTEGER NOT NULL
module_type       TEXT CHECK ('concept','practical','quiz','project_walkthrough')
estimated_minutes INTEGER
tech_stack_id     UUID FK → tech_stacks
prerequisites     UUID[]
```

#### learning_progress
```sql
id              UUID PK
user_id         UUID FK → users ON DELETE CASCADE
module_id       UUID FK → learning_modules ON DELETE CASCADE
status          TEXT DEFAULT 'not_started' CHECK ('not_started','in_progress','completed','skipped')
score           DECIMAL(5,2)
time_spent      INTEGER        -- 초
attempts        INTEGER DEFAULT 0
completed_at    TIMESTAMPTZ
UNIQUE(user_id, module_id)
```

#### ai_conversations
```sql
id                UUID PK
user_id           UUID FK → users ON DELETE CASCADE
project_id        UUID FK → projects ON DELETE CASCADE
learning_path_id  UUID FK → learning_paths ON DELETE CASCADE
title             TEXT
messages          JSONB NOT NULL DEFAULT '[]'
context_type      TEXT CHECK ('tech_analysis','learning','general','project_walkthrough')
llm_provider      TEXT
total_tokens      INTEGER DEFAULT 0
```

#### payments
```sql
id              UUID PK
user_id         UUID FK → users ON DELETE CASCADE
order_id        TEXT UNIQUE NOT NULL   -- 토스 주문 ID
payment_key     TEXT                   -- 토스 결제 키
plan            TEXT NOT NULL CHECK ('pro','team')
amount          INTEGER NOT NULL       -- KRW
status          TEXT DEFAULT 'pending' CHECK ('pending','done','canceled','failed')
method          TEXT
is_recurring    BOOLEAN DEFAULT false
```

#### technology_knowledge
```sql
id                          UUID PK
technology_name             TEXT NOT NULL
technology_name_normalized  TEXT UNIQUE NOT NULL  -- 소문자 정규화
version                     TEXT
concepts                    JSONB NOT NULL DEFAULT '[]'  -- ConceptHint[]
source                      TEXT DEFAULT 'llm_generated' CHECK ('seed','llm_generated')
generation_status           TEXT DEFAULT 'ready' CHECK ('ready','generating','failed')
llm_provider                TEXT
llm_model                   TEXT
generation_error            TEXT
generated_at                TIMESTAMPTZ
```

### 2.3 FK 관계도 (핵심)

```
auth.users ─┬→ users
             │
             ├→ user_api_keys
             ├→ user_llm_keys
             ├→ projects ─┬→ project_files
             │            ├→ tech_stacks ──→ learning_modules (tech_stack_id)
             │            ├→ analysis_jobs
             │            ├→ educational_analyses
             │            ├→ ai_conversations
             │            └→ mcp_sessions
             ├→ learning_paths ──→ learning_modules ──→ learning_progress
             ├→ payments
             └→ admin_audit_log
```

### 2.4 RLS 정책 요약

- 모든 테이블에 RLS 활성화
- 기본: `auth.uid() = user_id` 패턴
- Admin: `is_admin()` / `is_super_admin()` DEFINER 함수
- Service Role: RLS 바이패스 (MCP/백그라운드)
- `technology_knowledge`: 모든 인증 사용자 읽기 허용

### 2.5 RPC 함수

| 함수 | 반환 | 설명 |
|------|------|------|
| `handle_new_user()` | TRIGGER | auth 가입 시 users 자동 생성 |
| `is_admin()` | boolean | admin/super_admin 확인 |
| `is_super_admin()` | boolean | super_admin 확인 |
| `get_dashboard_data()` | JSON | 대시보드 통합 데이터 (16+쿼리 → 1 RPC) |
| `update_updated_at()` | TRIGGER | updated_at 자동 갱신 |

---

## 3. 비즈니스 로직 상세

### 3.1 인증 플로우

```
1. Supabase Auth (email/OAuth) → auth.users 생성
2. handle_new_user() 트리거 → users 테이블 자동 생성
3. middleware.ts → 매 요청마다 세션 갱신 + 레이트 리밋
4. 외부 API: Authorization: Bearer vs_<key> → bcrypt 비교 → user_id
5. 내부 API/페이지: Supabase 세션 쿠키 기반
```

### 3.2 프로젝트 분석 플로우

```
[MCP Client / REST API / Web]
       │
       ▼
1. POST /api/v1/projects — 프로젝트 생성/갱신
       │
       ▼
2. POST /api/v1/projects/:id/files — 파일 업로드
   - file-parser.ts: detectFileType() → 파일 분류
   - extractTechHints() → 의존성/설정에서 기술 힌트 추출
       │
       ▼
3. POST /api/v1/projects/:id/analyze — 분석 시작
   - analysis_jobs 생성 (status: pending)
   - project status → "analyzing"
   - digest-generator.ts: generateDigest() → 프로젝트 다이제스트
   - tech-analysis.ts: buildDigestAnalysisPrompt() → LLM 프롬프트
   - factory.ts: createLLMProvider() → LLM 호출
   - parse-analysis.ts: parseAnalysisResponse() → 결과 검증
   - tech_stacks 테이블에 저장
   - project status → "analyzed"
       │
       ▼
4. GET /api/v1/projects/:id/analyze/:jobId — 상태 폴링
   - { status, tech_stacks[], error_message }
```

### 3.3 학습 커리큘럼 생성 플로우 (2-Phase)

```
[사용자 요청: POST /api/v1/learning/generate]
       │
       ▼
Phase 1: 구조 생성
   - project-digest.ts: buildProjectDigest() → 프로젝트 요약
   - learning-roadmap.ts: buildStructurePrompt() → LLM에 구조 요청
   - LLM 응답: { title, modules[]: { title, type, tech_name, objectives } }
   - learning_paths + learning_modules 저장 (content 비어있음)
       │
       ▼
Phase 2: 콘텐츠 생성 (기술별 배치)
   - 각 tech_name 그룹별로:
     - knowledge/index.ts: getKBHints() → KB 힌트 조회
     - 관련 소스 파일 필터링
     - learning-roadmap.ts: buildContentBatchPrompt() → LLM에 콘텐츠 요청
     - LLM 응답: { modules[]: { content: { sections[] } } }
     - learning_modules.content 업데이트
       │
       ▼
결과: 완성된 학습 경로 (구조 + 콘텐츠)
```

### 3.4 모듈 콘텐츠 구조 (content.sections[])

```typescript
Section = {
  type: 'explanation' | 'code_example' | 'quiz_question' | 'challenge' | 'reflection'
  title: string
  body: string           // 마크다운
  code?: string          // 코드 블록
  quiz_options?: string[]
  quiz_answer?: number
  quiz_explanation?: string
  challenge_starter_code?: string
  challenge_answer_code?: string
}
```

### 3.5 AI 튜터 채팅

```
1. 사용량 확인 (Free: 월 20회)
2. 프로젝트 파일 로드 (최대 10개)
3. 기술 스택 로드
4. tutor-chat.ts: buildTutorPrompt() → 시스템 프롬프트
   - 학생의 실제 코드를 참조
   - 간단하게 설명, 전문용어 자제
   - ~500 단어 제한
5. LLM 호출 → 응답
6. ai_conversations에 저장 (messages JSONB)
7. 토큰 사용량 추적
```

### 3.6 결제 플로우 (토스페이먼츠)

```
1. createPaymentRequest(plan)
   - Pro: ₩25,000/월, Team: ₩59,000/월
   - toss_customer_key 생성/조회
   - orderId 생성, payments 레코드 생성

2. 토스 결제창 → 결제 완료

3. POST /api/payments/confirm
   - 토스 API 확인
   - payments.status → 'done'
   - users.plan_type 업데이트
   - plan_expires_at 설정

4. POST /api/payments/webhook
   - 결제 이벤트 수신 (자동 갱신 등)

5. POST /api/payments/cancel
   - 구독 해지
   - plan_type → 'free'
```

### 3.7 MCP 서버 도구 (10개, v0.3.0)

| 도구 | 설명 | 핵심 로직 |
|------|------|----------|
| `vibeuniv_sync_project` | 프로젝트 스캔+업로드 | file-scanner로 스캔 → API로 생성+파일 업로드 |
| `vibeuniv_upload_files` | 추가 파일 업로드 | 기존 프로젝트에 파일 추가 |
| `vibeuniv_analyze` | 기술 분석 (로컬) | 서버에서 파일 fetch → 로컬 AI에 분석 지침 반환 (서버 LLM 호출 0) |
| `vibeuniv_submit_tech_stacks` | 분석 결과 저장 | 로컬 분석 결과를 tech_stacks에 upsert + KB 생성 트리거 |
| `vibeuniv_get_learning` | 학습 경로 조회 | 생성된 커리큘럼 가져오기 |
| `vibeuniv_ask_tutor` | AI 튜터 (로컬) | 서버에서 컨텍스트 fetch → 로컬 AI에 튜터 지침 반환 (서버 LLM 호출 0) |
| `vibeuniv_log_session` | 세션 로그 | 개발 세션 메타데이터 기록 |
| `vibeuniv_submit_analysis` | 교육 분석 제출 | 수동 분석 데이터 저장 |
| `vibeuniv_generate_curriculum` | 커리큘럼 생성 (로컬) | 통합 API 1회로 컨텍스트 fetch → 로컬 AI에 지침 반환 |
| `vibeuniv_submit_curriculum` | 커리큘럼 제출 | 편집된 커리큘럼 저장 |

> **Local-First 패턴 (v0.3.0)**: `analyze`, `ask_tutor`, `generate_curriculum`은 서버 LLM을 호출하지 않고, 서버에서 데이터만 fetch한 뒤 로컬 AI(Claude Code 등)에게 분석/튜터링/생성 지침을 반환한다. 결과는 companion 도구(`submit_tech_stacks`, `submit_curriculum`)로 서버에 저장한다.

### 3.8 Knowledge Base 시스템

```
3-Tier 조회:
  1. 인메모리 캐시 (Map)
  2. DB: technology_knowledge 테이블
  3. 정적 시드: lib/knowledge/data/*.ts

시드 데이터 (5개):
  - Next.js (5 concepts)
  - React (6 concepts)
  - TypeScript (5 concepts)
  - Supabase (5 concepts)
  - Tailwind CSS (5 concepts)

ConceptHint 구조:
  {
    concept_key: "app-router"         // kebab-case
    concept_name: "App Router"        // 한국어 표시명
    key_points: [...]                 // 3-5 핵심 포인트
    common_quiz_topics: [...]         // 2-3 퀴즈 토픽
    prerequisite_concepts: [...]      // 선행 개념 키
    tags: [...]                       // 3-5 검색 태그
  }
```

### 3.9 사용량 제한

| 리소스 | Free | Pro | Team |
|--------|------|-----|------|
| 프로젝트 | 3 | 무제한 | 무제한 |
| 학습 경로 | 월 20 | 무제한 | 무제한 |
| AI 채팅 | 월 20 | 무제한 | 무제한 |

### 3.10 LLM Provider 지원

| Provider | 모델 | 어댑터 |
|----------|------|--------|
| Anthropic | claude-sonnet-4-20250514 | anthropic.ts |
| Google | gemini-2.0-flash | google.ts |
| OpenAI | gpt-4o-mini | openai-compat.ts |
| Groq | llama-3.3-70b-versatile | openai-compat.ts |
| Mistral | mistral-small-latest | openai-compat.ts |
| DeepSeek | deepseek-chat | openai-compat.ts |
| Together | llama-3.3-70b | openai-compat.ts |
| Fireworks | llama-v3p3-70b | openai-compat.ts |
| XAI | grok-2-latest | openai-compat.ts |
| OpenRouter | llama-3.3-70b | openai-compat.ts |
| Cohere | command-r-plus | cohere.ts |

---

## 4. 보안 아키텍처

### 4.1 인증 계층

| 계층 | 방식 | 용도 |
|------|------|------|
| 세션 | Supabase Auth 쿠키 | 웹 UI (내부 API) |
| API 키 | Bearer vs_<hex> + bcrypt | 외부 API (MCP/CLI) |
| Service Role | SUPABASE_SERVICE_ROLE_KEY | 백그라운드 작업 |

### 4.2 암호화

- **LLM 키**: AES-256-GCM (ENCRYPTION_KEY 환경변수)
- **API 키**: bcrypt 12 rounds (단방향 해시)
- **토스 시크릿 키**: 환경변수 (TOSS_SECRET_KEY)

### 4.3 레이트 리밋

| 경로 | 제한 | 키 |
|------|------|-----|
| `/api/v1/*` | 60/분 | API 키 또는 IP |
| `/api/auth/*` | 10/분 | IP |
| `/api/payments/*` | 20/분 | IP |

---

## 5. 핵심 타입 정의 (TypeScript)

```typescript
// 열거형 타입들 (types/database.ts)
type PlanType = 'free' | 'pro' | 'team'
type ProjectStatus = 'created' | 'uploaded' | 'analyzing' | 'analyzed' | 'error'
type SourceChannel = 'mcp' | 'api' | 'cli' | 'web_upload'
type FileType = 'dependency' | 'ai_config' | 'build_config' | 'source_code' | 'other'
type TechCategory = 'framework' | 'language' | 'database' | 'auth' | 'deploy' | 'styling' | 'testing' | 'build_tool' | 'library' | 'other'
type Importance = 'core' | 'supporting' | 'dev_dependency'
type JobType = 'tech_analysis' | 'learning_generation' | 'full_analysis'
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
type Difficulty = 'beginner' | 'intermediate' | 'advanced'
type ModuleType = 'concept' | 'practical' | 'quiz' | 'project_walkthrough'
type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped'
type ContextType = 'tech_analysis' | 'learning' | 'general' | 'project_walkthrough'
type PaymentStatus = 'pending' | 'done' | 'canceled' | 'failed'
type UserRole = 'user' | 'admin' | 'super_admin'
type LlmProvider = 'anthropic' | 'openai' | 'google' | 'groq' | 'mistral' | 'deepseek' | 'cohere' | 'together' | 'fireworks' | 'xai' | 'openrouter'
```

```typescript
// LLM Provider 인터페이스 (lib/llm/types.ts)
interface LLMProvider {
  analyze(input: AnalysisInput): Promise<AnalysisOutput>
  chat(input: ChatInput): Promise<ChatOutput>
}

// API 응답 형식 (lib/utils/api-response.ts)
{ success: boolean, data?: T, error?: string }
```

---

## 6. 마이그레이션 히스토리

| # | 파일 | 내용 |
|---|------|------|
| 001 | initial_schema.sql | 핵심 12개 테이블 + RLS + 트리거 |
| 002 | cascade_delete.sql | ai_conversations, mcp_sessions FK CASCADE 수정 |
| 003 | admin_system.sql | 어드민 역할, system_settings, announcements, audit_log |
| 004 | educational_analysis.sql | educational_analyses 테이블 |
| 005 | dashboard_rpc.sql | get_dashboard_data() RPC 함수 |
| 006 | toss_payments.sql | 토스페이먼츠 (payments 테이블, users 컬럼 변경) |
| 007 | technology_knowledge.sql | technology_knowledge 테이블 + 시드 데이터 5종 |

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
│   ├── not-found.tsx                 # 커스텀 404 페이지
│   ├── opengraph-image.tsx           # 다이나믹 OG 이미지 (1200x630)
│   ├── twitter-image.tsx             # 다이나믹 Twitter 카드 이미지
│   │
│   ├── (auth)/                       # 인증 페이지 그룹
│   │   ├── layout.tsx                # 인증 페이지 공통 메타데이터 (noindex)
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx            # 로그인 페이지 메타데이터
│   │   ├── signup/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx            # 회원가입 페이지 메타데이터
│   │   └── callback/route.ts         # OAuth 콜백 (next 파라미터 검증)
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
│       ├── payments/                 # Stripe
│       │   ├── checkout/route.ts     # POST: Stripe Checkout Session 생성
│       │   ├── portal/route.ts       # POST: Stripe Customer Portal 세션
│       │   └── webhook/route.ts      # POST: Stripe 웹훅
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
│           ├── user/
│           │   └── locale/route.ts            # GET: 사용자 locale 조회 (MCP용)
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
│   │   ├── theme-provider.tsx        # next-themes 래퍼
│   │   └── theme-toggle.tsx          # 라이트/다크 모드 토글 버튼
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
│       ├── module-content.tsx         # 모듈 학습 (섹션 렌더링, 텍스트 선택→AI질문)
│       ├── tutor-chat.tsx             # AI 튜터 채팅 인터페이스
│       ├── tutor-search.tsx           # 튜터 패널 Google 검색 탭
│       ├── tutor-panel.tsx            # AI 튜터 우측 슬라이드 패널 (채팅/검색 탭)
│       ├── tutor-panel-context.tsx    # 튜터 패널 상태 Context Provider
│       ├── dashboard-main.tsx         # 대시보드 main 래퍼 (패널 push 효과)
│       ├── billing-manager.tsx        # 구독 관리 (Stripe Checkout/Portal)
│       ├── upgrade-modal.tsx          # 업그레이드 모달
│       ├── dashboard-upgrade-banner.tsx
│       ├── api-key-manager.tsx        # API 키 생성/관리
│       ├── llm-key-manager.tsx        # LLM 키 암호화 저장
│       ├── usage-progress.tsx         # 사용량 프로그레스 바
│       ├── celebration-modal.tsx       # 모듈 완료 축하 (confetti 애니메이션)
│       ├── streak-widget.tsx          # 학습 스트릭 주간 캘린더 위젯
│       ├── weekly-target-setting.tsx   # 주간 학습 목표 설정 (2/3/5/7일)
│       ├── badge-earned-modal.tsx      # 배지 획득 알림 모달
│       ├── badge-grid.tsx             # 배지 그리드 (전체 배지 + 잠금 상태)
│       ├── locale-selector.tsx        # 언어 선택 (ko/en) + DB/쿠키 동기화
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
│   │   ├── translate-error.ts        # 서버 에러 코드 → i18n 번역 헬퍼
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
│   │   ├── billing.ts                # Stripe 결제 (Checkout/Portal)
│   │   ├── dashboard.ts              # 대시보드 RPC
│   │   ├── streak.ts                 # 학습 스트릭 (getStreak, updateStreak, updateWeeklyTarget)
│   │   ├── badges.ts                 # 배지/업적 (getUserBadges, getAllBadges, checkAndAwardBadges)
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
│               ├── create-curriculum.ts    # vibeuniv_create_curriculum (draft 생성)
│               ├── generate-module-content.ts # vibeuniv_generate_module_content (모듈별 콘텐츠 프롬프트)
│               └── submit-module.ts        # vibeuniv_submit_module (모듈별 개별 제출)
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql          # 핵심 테이블 12개
│       ├── 002_cascade_delete_*.sql        # FK CASCADE 수정
│       ├── 003_admin_system.sql            # 어드민 시스템
│       ├── 004_educational_analysis.sql    # 교육 분석 테이블
│       ├── 005_dashboard_rpc.sql           # get_dashboard_data() RPC
│       ├── 006_toss_payments.sql           # 결제 테이블 (레거시명)
│       ├── 019_stripe_migration.sql       # Stripe 마이그레이션 (toss→stripe 컬럼)
│       ├── 007_technology_knowledge.sql    # 기술 KB + 시드 데이터
│       ├── 011_badges.sql                 # 배지/업적 시스템 (badges, user_badges)
│       └── 012_user_streaks.sql           # 학습 스트릭 (user_streaks)
│
├── i18n/
│   └── request.ts                    # next-intl 설정 (cookie→Accept-Language→default locale)
│
├── messages/                         # i18n 번역 파일 (13 네임스페이스)
│   ├── ko/                           # 한국어
│   │   ├── Common.json, Auth.json, Dashboard.json, Settings.json,
│   │   ├── Billing.json, Learning.json, Projects.json, Tutor.json,
│   │   ├── Landing.json, Guide.json, Metadata.json, NotFound.json,
│   │   └── Errors.json               # 서버 에러 코드 번역
│   └── en/                           # 영어 (동일 구조)
│
├── scripts/                          # 유틸리티 스크립트
├── middleware.ts                      # Next.js 미들웨어 (세션+레이트리밋+locale 자동감지)
├── next.config.ts                    # createNextIntlPlugin 래핑
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

---

## 2. 데이터베이스 스키마

### 2.1 테이블 목록 (21개)

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
| 17 | `payments` | 결제 내역 (Stripe) | 006, 019 |
| 18 | `technology_knowledge` | 기술 KB (시드+LLM) | 007 |
| 19 | `badges` | 배지 정의 (10종, code_challenger 비활성화됨: is_active=false) | 011, 022, 023 |
| 20 | `user_badges` | 사용자 배지 획득 기록 | 011 |
| 21 | `user_streaks` | 학습 스트릭 (연속 학습일, 주간 목표, 주간 활동) | 012 |
| 22 | `user_concept_mastery` | 개념별 숙련도 (concept_key 기반) | 013, 020 |

### 2.2 핵심 테이블 상세

#### users
```sql
id              UUID PK (→ auth.users)
email           TEXT UNIQUE NOT NULL
name            TEXT
avatar_url      TEXT
plan_type       TEXT DEFAULT 'free' CHECK ('free','pro','team')
plan_expires_at TIMESTAMPTZ
stripe_customer_id     TEXT   -- Stripe Customer ID
stripe_subscription_id TEXT   -- Stripe Subscription ID
role            TEXT DEFAULT 'user' CHECK ('user','admin','super_admin')
is_banned       BOOLEAN DEFAULT false
banned_at       TIMESTAMPTZ
ban_reason      TEXT
onboarding_completed BOOLEAN DEFAULT false
locale          TEXT NOT NULL DEFAULT 'ko' CHECK ('ko','en')  -- 학습 콘텐츠 언어
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
estimated_hours DECIMAL(5,1)  -- 모듈 estimated_minutes 합산 → ceil(sum/60)으로 계산
total_modules   INTEGER DEFAULT 0
llm_provider    TEXT
status          TEXT DEFAULT 'draft' CHECK ('draft','active','completed','archived')
locale          TEXT NOT NULL DEFAULT 'ko' CHECK ('ko','en')  -- 콘텐츠 언어
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
prerequisites     UUID[]                        -- R4': 자동 계산된 선수 모듈 ID (Phase 3)
concept_keys      TEXT[] DEFAULT '{}'            -- R6: 이 모듈이 가르치는 KB 개념 키 (Phase 2, GIN 인덱스)
```

#### learning_progress
```sql
id              UUID PK
user_id         UUID FK → users ON DELETE CASCADE
module_id       UUID FK → learning_modules ON DELETE CASCADE
status          TEXT DEFAULT 'not_started' CHECK ('not_started','in_progress','completed','skipped')
score           DECIMAL(5,2)   -- 퀴즈 점수 0-100, 최고점 유지(Math.max)
time_spent      INTEGER        -- 초, 누적 합산
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
id                UUID PK
user_id           UUID FK → users ON DELETE CASCADE
order_id          TEXT UNIQUE NOT NULL
payment_key       TEXT
plan              TEXT NOT NULL CHECK ('pro','team')
amount            INTEGER NOT NULL       -- cents (USD)
status            TEXT DEFAULT 'pending' CHECK ('pending','done','canceled','failed')
method            TEXT
is_recurring      BOOLEAN DEFAULT false
stripe_session_id TEXT                   -- Stripe Checkout Session ID
currency          TEXT DEFAULT 'usd'
```

#### technology_knowledge
```sql
id                          UUID PK
technology_name             TEXT NOT NULL
technology_name_normalized  TEXT NOT NULL  -- 소문자 정규화
locale                      TEXT NOT NULL DEFAULT 'ko' CHECK ('ko','en')  -- UNIQUE(name_normalized, locale)
version                     TEXT
concepts                    JSONB NOT NULL DEFAULT '[]'  -- ConceptHint[]
source                      TEXT DEFAULT 'llm_generated' CHECK ('seed','llm_generated')
generation_status           TEXT DEFAULT 'ready' CHECK ('ready','generating','failed')
llm_provider                TEXT
llm_model                   TEXT
generation_error            TEXT
generated_at                TIMESTAMPTZ
```

#### user_concept_mastery
```sql
id              UUID PK
user_id         UUID FK → users ON DELETE CASCADE
knowledge_id    UUID (FK → technology_knowledge, 비정형)
concept_key     TEXT                                -- NULL = 기술 단위(레거시), 값 = 개념 단위
mastery_level   INTEGER DEFAULT 0                   -- 0-100
updated_at      TIMESTAMPTZ
UNIQUE INDEX(user_id, knowledge_id, COALESCE(concept_key, '__TECH_LEVEL__'))
INDEX(user_id, concept_key) WHERE concept_key IS NOT NULL
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
   - after(): 다이제스트 생성을 백그라운드로 처리 (응답 비블로킹)
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
   - users.locale 조회 → 프롬프트 언어 분기 (ko/en)
   - project-digest.ts: buildProjectDigest() → 프로젝트 요약
   - learning-roadmap.ts: buildStructurePrompt(locale) → LLM에 구조 요청
   - LLM 응답: { title, modules[]: { title, type, tech_name, objectives } }
   - learning_paths + learning_modules 저장 (content 비어있음, locale 포함)
       │
       ▼
Phase 2: 콘텐츠 생성 (기술별 배치, maxTokens: beginner 24000*n / 그 외 16000*n, cap 128K)
   - 각 tech_name 그룹별로:
     - knowledge/index.ts: getKBHints() → KB 힌트 조회
     - 관련 소스 파일 필터링
     - learning-roadmap.ts: buildContentBatchPrompt() → LLM에 콘텐츠 요청
       - beginner: 7-12섹션, 8-12문단, 400자↑, 5~6세 수준 설명 (3단계 개념 쪼개기, before/after 비교, 우리말 번역, 비유 퀴즈)
       - intermediate/advanced: 5-8섹션, 5-8문단, 200자↑
       - 📚 더 알아보기 (공식 문서 인용 링크) 필수
       - 코드 라인별 설명 (numbered list) 필수
     - LLM 응답: { modules[]: { content: { sections[] } } }
     - _validateGeneratedSections(sections, difficulty) 검증:
       - beginner: 최소 5섹션, explanation 400자↑ / 그 외: 최소 3섹션, 200자↑
       - code_example + quiz_question 각각 필수
       - 실패 시 최대 3회 retry (meta.retry_count 추적)
       - 3회 초과 시 validation_failed 상태로 저장
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
4. moduleId가 있으면 해당 모듈의 title + section titles + content summary(6000자)를 학습 컨텍스트에 포함
5. tutor-chat.ts: buildTutorPrompt() → 시스템 프롬프트
   - 학생의 실제 코드를 참조
   - 해요체 톤 (친절한 선배 개발자), 비유 활용, 격려 필수
   - ~500 단어 제한
   - module_sections 블록: 학생이 보고 있는 모듈 섹션 목록 포함
   - module_content_summary 블록: 모듈 본문/코드/퀴즈 서머리(6000자 제한)
6. LLM 호출 → 응답
7. ai_conversations에 저장 (messages JSONB)
8. 토큰 사용량 추적
```

**UI 구조:**
- 우측 슬라이드 패널 (420px, `tutor-panel.tsx`), 2개 탭: 채팅(`tutor-chat.tsx`) / 검색(`tutor-search.tsx`)
- `TutorPanelProvider` (Context) → `DashboardMain` (push 효과) → `TutorPanel`
- 텍스트 선택 시 플로팅 "AI 튜터에게 물어보기" 툴팁 → 클릭 시 패널 열림 + 질문 자동 입력 + 채팅 탭 전환
- 검색 탭: Google 검색 새 탭 열기, 추천 검색어(모듈명 기반), 최근 검색어(localStorage, 최대 5개)
- 모바일: 전체화면 오버레이 + 배경 터치 닫기

### 3.6 결제 플로우 (Stripe)

```
1. createCheckoutSession(plan)
   - Pro: $19/mo, Team: $45/mo
   - Stripe Customer 조회/생성 → stripe_customer_id 저장
   - Stripe Checkout Session 생성 → URL 반환

2. Stripe Checkout (호스팅 결제 페이지) → 결제 완료 → /settings/billing?success=true 리다이렉트

3. POST /api/payments/webhook (Stripe 웹훅)
   - stripe.webhooks.constructEvent() 서명 검증
   - checkout.session.completed → plan 업그레이드 + stripe IDs 저장 + payments 레코드 생성
   - customer.subscription.updated → plan 변경 반영
   - customer.subscription.deleted → plan_type='free' 다운그레이드
   - invoice.payment_failed → 로그 (Stripe 자동 retry)

4. 구독 관리: createPortalSession() → Stripe Customer Portal URL 반환
   - 카드 변경, 구독 취소, 인보이스 조회 모두 Stripe Portal에서 처리
```

### 3.7 MCP 서버 도구 (12개, v0.3.5)

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
| `vibeuniv_generate_curriculum` | 커리큘럼 생성 (로컬) | 통합 API 1회로 컨텍스트 fetch (tech stacks + KB + edu analysis + 파일 소스코드 20개) → 로컬 AI에 지침 반환 (최소 15 모듈, 프로젝트 기능 중심) |
| `vibeuniv_create_curriculum` | 커리큘럼 초안 생성 | draft learning_path 생성 → learning_path_id 반환 (기존 draft/active 삭제 후 새로 생성) |
| `vibeuniv_generate_module_content` | 모듈별 콘텐츠 프롬프트 | 캐시된 컨텍스트 + 소스코드 기반으로 단일 모듈 콘텐츠 생성 지침 반환 |
| `vibeuniv_submit_module` | 모듈별 개별 제출 | 단일 모듈 검증+저장, upsert(같은 module_order면 UPDATE), 전체 모듈 도착 시 자동 status="active" |

> **Local-First 패턴 (v0.3.12)**: `analyze`, `ask_tutor`, `generate_curriculum`은 서버 LLM을 호출하지 않고, 서버에서 데이터만 fetch한 뒤 로컬 AI(Claude Code 등)에게 분석/튜터링/생성 지침을 반환한다. 결과는 companion 도구로 서버에 저장한다.
>
> **Per-Module Submission (v0.3.12)**: `create_curriculum` → (`generate_module_content` → `submit_module`) × N 순서로 모듈별 개별 제출. v0.3.12에서 레거시 `submit_curriculum` 제거 — Per-Module만 지원.
>
> **MCP 다국어 지원**: 모든 MCP 도구는 `/api/v1/user/locale`에서 사용자 locale을 조회(캐시)하여 한국어/영어 메시지를 분기한다. `generate_curriculum`은 `curriculum-context` 응답의 `locale` 필드를 사용한다.

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

### 3.11 UI 다국어 (i18n) — next-intl

**방식:** next-intl "without i18n routing" — 쿠키 기반 locale, URL 변경 없음, `[locale]` 폴더 불필요

**Locale 결정 우선순위:**
1. `locale` 쿠키 (ko | en)
2. `Accept-Language` 헤더 파싱 (middleware에서 자동 감지 → 쿠키 설정)
3. DB `users.locale` (auth callback에서 동기화)
4. 기본값: `ko`

**핵심 파일:**
| 파일 | 역할 |
|------|------|
| `i18n/request.ts` | `getRequestConfig()` — 쿠키/헤더 기반 locale + 13개 네임스페이스 동적 import |
| `next.config.ts` | `createNextIntlPlugin('./i18n/request.ts')` 래핑 |
| `app/layout.tsx` | `NextIntlClientProvider` + `<html lang={locale}>` |
| `middleware.ts` | 첫 방문 시 Accept-Language → locale 쿠키 자동 설정 |
| `app/(auth)/callback/route.ts` | 로그인 시 DB ↔ 쿠키 locale 동기화 |
| `components/features/locale-selector.tsx` | 설정 UI에서 언어 변경 → DB + 쿠키 + `router.refresh()` |
| `lib/utils/translate-error.ts` | 서버 에러 코드 → `Errors` 네임스페이스 번역 |

**네임스페이스 (13개):**
`Common`, `Metadata`, `Landing`, `Auth`, `Dashboard`, `Projects`, `Learning`, `Settings`, `Billing`, `Tutor`, `Guide`, `NotFound`, `Errors`

**번역 키:** 약 1,300개 (ko/en 각각)

**서버 에러 코드화:**
- 서버 액션/API에서 한국어 에러 → 영어 에러 코드로 반환 (예: `already_free_plan`)
- 프론트: `translateError(error, te)` → `Errors` 네임스페이스에서 코드 조회 → 번역된 메시지 표시
- 해당 컴포넌트: `billing-manager.tsx`, `payment-confirm.tsx`, `module-content.tsx`, `learning-generator.tsx`

**쿠키 동기화 플로우:**
```
첫 방문 → middleware: Accept-Language → locale 쿠키 설정
로그인  → callback: DB locale ↔ 쿠키 동기화 (첫 가입: 쿠키→DB / 기존: DB→쿠키)
설정 변경 → locale-selector: updateUserLocale(DB) + document.cookie + router.refresh()
```

---

## 4. 보안 아키텍처

### 4.1 인증 계층

| 계층 | 방식 | 용도 |
|------|------|------|
| 세션 | Supabase Auth 쿠키 | 웹 UI (내부 API) |
| API 키 | Bearer vs_<hex> + bcrypt | 외부 API (MCP/CLI) |
| Service Role | SUPABASE_SERVICE_ROLE_KEY | 백그라운드 작업 |

**보안 강화 (PR #48, #49):**
- `getAuthUser()`에서 `is_banned` 체크 → 밴 유저 전체 차단
- Admin dev-mode 바이패스는 `NODE_ENV === "development"`일 때만 동작
- OAuth 콜백 `next` 파라미터 검증 (`//` 시작 차단, open redirect 방지)

### 4.2 암호화

- **LLM 키**: AES-256-GCM (ENCRYPTION_KEY 환경변수)
- **API 키**: bcrypt 12 rounds (단방향 해시)
- **Stripe 키**: 환경변수 (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- **콘텐츠 복호화 실패 시**: 암호문 형식 감지 → `[Decryption failed]` 반환 (암호문 미노출)

### 4.3 레이트 리밋

| 경로/액션 | 제한 | 키 |
|-----------|------|-----|
| `/api/v1/*` | 60/분 | API 키 또는 IP |
| `/api/auth/*` | 10/분 | IP |
| `/api/payments/*` | 20/분 | IP |
| `startAnalysis` (Server Action) | 5/분 | user_id |
| `generateLearningPath` (Server Action) | 5/분 | user_id |
| `sendTutorMessage` (Server Action) | 20/분 | user_id |

> **Note**: 인메모리 레이트 리미터 사용 중. Vercel Serverless에서 인스턴스간 공유 안 됨. 추후 Redis/Upstash로 교체 필요.

### 4.4 결제 보안 (Stripe)

- **Checkout**: Stripe 호스팅 결제 페이지 사용 (카드 정보 서버 미경유)
- **웹훅 검증**: `stripe.webhooks.constructEvent()` 서명 검증 (STRIPE_WEBHOOK_SECRET)
- **구독 관리**: Stripe Customer Portal (카드 변경, 구독 취소 등 모두 Stripe에서 처리)
- **Payments RLS**: SELECT만 허용, INSERT/UPDATE/DELETE는 service_role만 가능 (명시적 deny 정책)

### 4.5 파일 업로드 제한

- 파일당 최대 100KB (`MAX_FILE_CONTENT_SIZE`)
- 요청당 최대 100개 파일 (`MAX_FILES_PER_UPLOAD`)
- `app/api/v1/projects/[id]/files/route.ts`에서 검증

### 4.6 HTTP 보안 헤더 (next.config.ts)

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy`: self + Toss SDK + Supabase + Pretendard CDN + Google Fonts

### 4.7 Admin 검색 보안

- PostgREST 필터 인젝션 방지: `%`, `_`, `,`, `(`, `)`, `.` 문자 제거 후 `.or()` 사용

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
| 008 | payments_rls.sql | payments 테이블 INSERT/UPDATE/DELETE deny 정책 + admin SELECT 정책 |
| 009 | payments_webhook_secret.sql | payments 테이블에 toss_secret 컬럼 추가 (웹훅 검증용) |
| 011 | badges.sql | badges, user_badges 테이블 + RLS + 시드 8종 (first_step, consistent_learner, quiz_master, code_challenger, fullstack_explorer, versatile, ai_friend, speedster) |
| 012 | user_streaks.sql | user_streaks 테이블 (current_streak, longest_streak, weekly_target, last_active_date, week_active_days, week_start_date) + RLS |
| 010 | locale_support.sql | users, learning_paths, technology_knowledge에 locale 컬럼 추가 + technology_knowledge unique constraint (name_normalized, locale) 변경 |
| 023 | fix_badge_conditions.sql | code_challenger 비활성화 (is_active=false), speedster condition_value 10→15 완화 |

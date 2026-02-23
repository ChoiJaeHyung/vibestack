# VibeUniv 시스템 아키텍처 문서

> **최종 업데이트:** 2026-02-23
> **버전:** 0.1.0
> **도메인:** vibeuniv.com
> **GitHub:** ChoiJaeHyung/vibestack

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [기술 스택](#3-기술-스택)
4. [디렉토리 구조](#4-디렉토리-구조)
5. [데이터베이스 스키마](#5-데이터베이스-스키마)
6. [API 설계](#6-api-설계)
7. [인증 및 보안](#7-인증-및-보안)
8. [LLM 통합 시스템](#8-llm-통합-시스템)
9. [핵심 비즈니스 로직](#9-핵심-비즈니스-로직)
10. [MCP 서버](#10-mcp-서버)
11. [과금 시스템](#11-과금-시스템)
12. [프론트엔드 구조](#12-프론트엔드-구조)

---

## 1. 프로젝트 개요

### 1.1 VibeUniv란?

VibeUniv는 **바이브 코더(Vibe Coder)** 들이 AI 도구(Claude Code, Cursor, Bolt 등)로 만든 프로젝트의 기술 스택을 이해하고 학습할 수 있도록 돕는 플랫폼이다.

**핵심 가치:** "만들었으면 반은 왔어요. 나머지 반, 여기서 채워요"

### 1.2 핵심 플로우

```
[사용자 프로젝트] → [MCP/API 수집] → [AI 기술 분석] → [맞춤 학습 로드맵] → [AI 튜터 학습]
```

1. 바이브 코더가 AI 코딩 도구로 앱을 만든다
2. VibeUniv MCP 서버 또는 REST API를 통해 프로젝트 데이터를 수집한다
3. AI가 기술 스택을 분석하고 맞춤 학습 로드맵을 생성한다
4. AI 튜터와 함께 실제 프로젝트 코드 기반으로 학습한다

### 1.3 데이터 수집 채널 (우선순위)

| 채널 | 설명 | 소스 |
|------|------|------|
| **MCP Server** | Claude Code, Cursor, Windsurf 등에서 자동 연결 | `packages/mcp-server/` |
| **REST API** | 웹 기반 도구에서 Webhook으로 전송 | `app/api/v1/` |
| **웹 업로드** | 수동 전송 폴백 | 대시보드 UI |

---

## 2. 시스템 아키텍처

### 2.1 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                            │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│  │Claude Code│  │  Cursor   │  │ Windsurf │  │ 웹 브라우저│  │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │              │              │         │
│       └──────┬───────┴──────┬───────┘              │         │
│              │              │                      │         │
│         MCP Protocol    REST API              Next.js SSR    │
└──────────────┼──────────────┼──────────────────────┼────────┘
               │              │                      │
┌──────────────▼──────────────▼──────────────────────▼────────┐
│                    Vercel Edge Network                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  middleware.ts (Rate Limiting + Auth Session)         │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                                │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │              Next.js 15 App Router                    │   │
│  │                                                       │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │  Pages/UI    │  │ API Routes   │  │  Server    │  │   │
│  │  │  (React 19)  │  │ (/api/v1/*)  │  │  Actions   │  │   │
│  │  └─────────────┘  └──────┬───────┘  └──────┬─────┘  │   │
│  │                          │                  │         │   │
│  │         ┌────────────────┴──────────────────┘         │   │
│  │         │                                             │   │
│  │  ┌──────▼──────────────────────────────────────┐     │   │
│  │  │              비즈니스 로직 레이어              │     │   │
│  │  │  lib/llm/     lib/analysis/   lib/learning/  │     │   │
│  │  │  lib/prompts/ lib/utils/      server/actions/ │     │   │
│  │  └──────┬──────────────┬──────────────┬────────┘     │   │
│  │         │              │              │               │   │
│  └─────────┼──────────────┼──────────────┼───────────────┘   │
│            │              │              │                    │
└────────────┼──────────────┼──────────────┼───────────────────┘
             │              │              │
   ┌─────────▼──┐  ┌───────▼────┐  ┌─────▼──────┐
   │ Supabase   │  │ LLM APIs   │  │  Stripe    │
   │ (DB+Auth)  │  │ (11 제공자) │  │ (결제)     │
   └────────────┘  └────────────┘  └────────────┘
```

### 2.2 레이어 구조

| 레이어 | 위치 | 역할 |
|--------|------|------|
| **Presentation** | `app/`, `components/` | UI 렌더링, 사용자 인터랙션 |
| **API** | `app/api/`, `middleware.ts` | HTTP 엔드포인트, 인증, Rate Limiting |
| **Business Logic** | `server/actions/`, `lib/` | 핵심 비즈니스 로직 |
| **Data Access** | `lib/supabase/` | DB 클라이언트, RLS 기반 접근 제어 |
| **External** | `lib/llm/`, Stripe SDK | 외부 서비스 통합 |
| **MCP** | `packages/mcp-server/` | IDE 연동 프로토콜 서버 |

---

## 3. 기술 스택

### 3.1 핵심 기술

| 영역 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js (App Router) | 15.5.12 |
| Language | TypeScript (strict mode) | 5.x |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Database | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth (Email + OAuth) | - |
| Payments | Stripe | 20.3.1 |
| MCP | @modelcontextprotocol/sdk | 1.12.1 |

### 3.2 LLM SDK

| 패키지 | 용도 |
|--------|------|
| `@anthropic-ai/sdk` ^0.78.0 | Anthropic Claude |
| `openai` ^6.22.0 | OpenAI + 호환 프로바이더 7개 |
| `@google/generative-ai` ^0.24.1 | Google Gemini |
| `cohere-ai` ^7.20.0 | Cohere |

### 3.3 프론트엔드 라이브러리

| 패키지 | 용도 |
|--------|------|
| `recharts` ^3.7.0 | 기술 분포 차트 |
| `react-markdown` ^10.1.0 | 마크다운 렌더링 |
| `rehype-highlight` ^7.0.2 | 코드 하이라이팅 |
| `remark-gfm` ^4.0.1 | GFM 마크다운 지원 |
| `lucide-react` ^0.575.0 | 아이콘 |
| `highlight.js` ^11.11.1 | 코드 구문 강조 |

### 3.4 보안/인프라

| 패키지 | 용도 |
|--------|------|
| `bcryptjs` ^3.0.3 | API 키 해싱 |
| Node.js `crypto` | AES-256-GCM 암호화 |
| `@supabase/ssr` ^0.8.0 | SSR 세션 관리 |

---

## 4. 디렉토리 구조

```
vibestack/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # 인증 관련 (login, signup, callback)
│   ├── (dashboard)/                # 인증 필요 페이지
│   │   ├── dashboard/              #   메인 대시보드
│   │   ├── projects/               #   프로젝트 관리
│   │   │   └── [id]/               #     프로젝트 상세
│   │   ├── learning/               #   학습 시스템
│   │   │   └── [pathId]/           #     학습 경로 상세
│   │   │       └── [moduleId]/     #       모듈 콘텐츠
│   │   └── settings/               #   설정 (API 키, LLM 키)
│   │       └── billing/            #     구독/결제
│   ├── api/
│   │   ├── auth/signout/           # 로그아웃
│   │   ├── stripe/                 # Stripe (checkout, portal, webhook)
│   │   └── v1/                     # 외부 REST API
│   │       ├── health/             #   헬스체크
│   │       ├── projects/           #   프로젝트 CRUD + 분석
│   │       │   └── [id]/
│   │       │       ├── files/      #     파일 업로드
│   │       │       ├── analyze/    #     분석 트리거
│   │       │       └── stack/      #     분석 결과
│   │       └── learning/           #   학습 시스템
│   │           ├── generate/       #     로드맵 생성
│   │           ├── paths/          #     학습 경로
│   │           ├── modules/        #     모듈 콘텐츠
│   │           ├── progress/       #     진도 관리
│   │           └── chat/           #     AI 튜터
│   ├── guide/                      # 온보딩 가이드
│   ├── layout.tsx                  # 루트 레이아웃
│   └── page.tsx                    # 랜딩 페이지
├── components/
│   ├── ui/                         # 공통 UI (Button, Card, Input, Sidebar, Loading)
│   └── features/                   # 기능별 컴포넌트
├── lib/
│   ├── supabase/                   # DB 클라이언트 (server, client, service, middleware)
│   ├── llm/                        # LLM 프로바이더 (factory, types, 4개 어댑터)
│   ├── analysis/                   # 파일 파싱 + 다이제스트 생성
│   ├── learning/                   # 프로젝트 컨텍스트 빌더
│   ├── prompts/                    # 프롬프트 템플릿 (분석, 로드맵, 튜터)
│   └── utils/                      # 유틸리티 (암호화, API 응답, 상수, Rate Limit 등)
├── server/
│   ├── actions/                    # Server Actions (6개)
│   └── middleware/                 # API 키 인증
├── types/                          # TypeScript 타입 (api.ts, database.ts)
├── packages/
│   └── mcp-server/                 # @vibeuniv/mcp-server (npm 패키지)
│       └── src/
│           ├── lib/                #   설정, API 클라이언트, 파일 스캐너
│           └── tools/              #   MCP 도구 6개
├── supabase/
│   └── migrations/                 # DB 마이그레이션 SQL
├── middleware.ts                   # Edge Middleware (Rate Limit + Session)
├── next.config.ts                  # 보안 헤더 설정
└── CLAUDE.md                       # 프로젝트 컨텍스트
```

---

## 5. 데이터베이스 스키마

### 5.1 ER 다이어그램

```
┌──────────┐     ┌───────────────┐     ┌──────────────┐
│  users   │────<│ user_api_keys │     │ user_llm_keys│
│          │────<│               │     │              │
│  id (PK) │     │ user_id (FK)  │     │ user_id (FK) │
│  email   │     │ key_hash      │     │ provider     │
│  plan    │     │ key_prefix    │     │ encrypted_key│
└────┬─────┘     └───────────────┘     └──────────────┘
     │
     │──────<┌──────────────┐
     │       │   projects   │
     │       │              │
     │       │  id (PK)     │
     │       │  user_id(FK) │──────<┌────────────────┐
     │       │  name        │       │ project_files  │
     │       │  status      │       │ project_id(FK) │
     │       │  tech_summary│       │ file_name      │
     │       └──────┬───────┘       │ raw_content    │
     │              │               └────────────────┘
     │              │
     │              │──────<┌────────────────┐
     │              │       │  tech_stacks   │
     │              │       │ project_id(FK) │
     │              │       │ technology_name│
     │              │       │ category       │
     │              │       │ confidence     │
     │              │       └────────────────┘
     │              │
     │              │──────<┌────────────────┐
     │              │       │ analysis_jobs  │
     │              │       │ project_id(FK) │
     │              │       │ user_id (FK)   │
     │              │       │ status         │
     │              │       │ token usage    │
     │              │       └────────────────┘
     │              │
     │              │──────<┌────────────────────┐
     │                      │  learning_paths    │
     │──────────────────────│ project_id (FK)    │
     │                      │ user_id (FK)       │
     │                      │ title, difficulty  │
     │                      └────────┬───────────┘
     │                               │
     │                               │──<┌───────────────────┐
     │                                   │ learning_modules  │
     │                                   │ learning_path(FK) │
     │                                   │ content (JSONB)   │
     │                                   │ module_type       │
     │                                   └────────┬──────────┘
     │                                            │
     │─────────────────────────────<┌─────────────┴──────────┐
     │                              │  learning_progress     │
     │                              │  user_id (FK)          │
     │                              │  module_id (FK)        │
     │                              │  status, score         │
     │                              └────────────────────────┘
     │
     │──────<┌──────────────────┐
     │       │ ai_conversations │
     │       │ user_id (FK)     │
     │       │ project_id (FK)  │
     │       │ messages (JSONB) │
     │       └──────────────────┘
     │
     │──────<┌──────────────┐
             │ mcp_sessions │
             │ user_id (FK) │
             │ project_id   │
             │ tools_called │
             └──────────────┘
```

### 5.2 테이블 상세

#### `users` — 사용자

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | auth.users FK, CASCADE |
| `email` | TEXT (UNIQUE) | 이메일 |
| `name` | TEXT | 표시 이름 |
| `avatar_url` | TEXT | 프로필 이미지 |
| `plan_type` | TEXT | `free` / `pro` / `team` |
| `plan_expires_at` | TIMESTAMPTZ | 구독 만료일 |
| `stripe_customer_id` | TEXT | Stripe 고객 ID |
| `onboarding_completed` | BOOLEAN | 온보딩 완료 여부 |
| `created_at` | TIMESTAMPTZ | 생성일 |
| `updated_at` | TIMESTAMPTZ | 수정일 |

**트리거:** `on_auth_user_created` — `auth.users` INSERT 시 자동으로 `public.users` 레코드 생성

#### `user_api_keys` — VibeUniv API 키

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `user_id` | UUID (FK) | users.id, CASCADE |
| `key_hash` | TEXT | bcrypt 해시 |
| `key_prefix` | TEXT | `vs_xxxx` (4자 prefix) |
| `name` | TEXT | 키 이름 (default: 'default') |
| `last_used_at` | TIMESTAMPTZ | 마지막 사용 시각 |
| `expires_at` | TIMESTAMPTZ | 만료일 |
| `is_active` | BOOLEAN | 활성 여부 |

#### `user_llm_keys` — 사용자 LLM API 키 (BYOK)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `user_id` | UUID (FK) | users.id, CASCADE |
| `provider` | TEXT | 11개 프로바이더 중 하나 |
| `encrypted_key` | TEXT | AES-256-GCM 암호화된 키 |
| `key_iv` | TEXT | 암호화 IV |
| `display_hint` | TEXT | 표시용 힌트 (예: `sk-...abc`) |
| `is_valid` | BOOLEAN | 유효성 검증 결과 |
| `is_default` | BOOLEAN | 기본 키 여부 |

**UNIQUE:** `(user_id, provider, encrypted_key)`

#### `projects` — 프로젝트

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `user_id` | UUID (FK) | users.id, CASCADE |
| `name` | TEXT | 프로젝트명 |
| `description` | TEXT | 설명 |
| `source_platform` | TEXT | 소스 플랫폼 (예: Claude Code) |
| `source_channel` | TEXT | `mcp` / `api` / `cli` / `web_upload` |
| `status` | TEXT | `created` → `uploaded` → `analyzing` → `analyzed` / `error` |
| `last_synced_at` | TIMESTAMPTZ | 마지막 동기화 |
| `tech_summary` | JSONB | 기술 요약 데이터 |

#### `project_files` — 프로젝트 파일

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `project_id` | UUID (FK) | projects.id, CASCADE |
| `file_name` | TEXT | 파일명 |
| `file_type` | TEXT | `dependency` / `ai_config` / `build_config` / `source_code` / `other` |
| `file_path` | TEXT | 파일 경로 |
| `raw_content` | TEXT | 파일 내용 (암호화 가능) |
| `file_size` | INTEGER | 파일 크기 (bytes) |
| `content_hash` | TEXT | 중복 감지용 해시 |

#### `tech_stacks` — 기술 스택 분석 결과

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `project_id` | UUID (FK) | projects.id, CASCADE |
| `technology_name` | TEXT | 기술명 |
| `category` | TEXT | `framework` / `language` / `database` / `auth` / `deploy` / `styling` / `testing` / `build_tool` / `library` / `other` |
| `subcategory` | TEXT | 세부 카테고리 |
| `version` | TEXT | 버전 |
| `confidence_score` | DECIMAL(3,2) | 신뢰도 (0.00~1.00) |
| `detected_from` | TEXT[] | 감지 소스 배열 |
| `description` | TEXT | 기술 설명 |
| `importance` | TEXT | `core` / `supporting` / `dev_dependency` |
| `relationships` | JSONB | `{ depends_on: [], used_with: [] }` |

**UNIQUE:** `(project_id, technology_name)`

#### `analysis_jobs` — 분석 작업 추적

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `project_id` | UUID (FK) | projects.id, CASCADE |
| `user_id` | UUID (FK) | users.id |
| `job_type` | TEXT | `tech_analysis` / `learning_generation` / `full_analysis` |
| `status` | TEXT | `pending` → `processing` → `completed` / `failed` |
| `llm_provider` | TEXT | 사용된 LLM 프로바이더 |
| `llm_model` | TEXT | 사용된 모델명 |
| `input_tokens` | INTEGER | 입력 토큰 수 |
| `output_tokens` | INTEGER | 출력 토큰 수 |
| `cost_usd` | DECIMAL(10,6) | 비용 (USD) |
| `error_message` | TEXT | 에러 메시지 |
| `started_at` | TIMESTAMPTZ | 시작 시각 |
| `completed_at` | TIMESTAMPTZ | 완료 시각 |

#### `learning_paths` — 학습 경로

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `project_id` | UUID (FK) | projects.id, CASCADE |
| `user_id` | UUID (FK) | users.id, CASCADE |
| `title` | TEXT | 경로 제목 |
| `description` | TEXT | 설명 |
| `difficulty` | TEXT | `beginner` / `intermediate` / `advanced` |
| `estimated_hours` | DECIMAL(5,1) | 예상 학습 시간 |
| `total_modules` | INTEGER | 전체 모듈 수 |
| `llm_provider` | TEXT | 생성에 사용된 LLM |
| `status` | TEXT | `draft` / `active` / `completed` / `archived` |

#### `learning_modules` — 학습 모듈

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `learning_path_id` | UUID (FK) | learning_paths.id, CASCADE |
| `title` | TEXT | 모듈 제목 |
| `description` | TEXT | 설명 |
| `content` | JSONB | 학습 콘텐츠 (섹션별 구조) |
| `module_order` | INTEGER | 순서 |
| `module_type` | TEXT | `concept` / `practical` / `quiz` / `project_walkthrough` |
| `estimated_minutes` | INTEGER | 예상 소요 시간 |
| `tech_stack_id` | UUID (FK) | tech_stacks.id (nullable) |
| `prerequisites` | UUID[] | 선수 모듈 ID 배열 |

#### `learning_progress` — 학습 진도

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `user_id` | UUID (FK) | users.id, CASCADE |
| `module_id` | UUID (FK) | learning_modules.id, CASCADE |
| `status` | TEXT | `not_started` / `in_progress` / `completed` / `skipped` |
| `score` | DECIMAL(5,2) | 점수 |
| `time_spent` | INTEGER | 소요 시간 (초) |
| `attempts` | INTEGER | 시도 횟수 |
| `completed_at` | TIMESTAMPTZ | 완료 시각 |

**UNIQUE:** `(user_id, module_id)`

#### `ai_conversations` — AI 튜터 대화

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `user_id` | UUID (FK) | users.id, CASCADE |
| `project_id` | UUID (FK) | projects.id, CASCADE |
| `learning_path_id` | UUID (FK) | learning_paths.id, CASCADE |
| `title` | TEXT | 대화 제목 |
| `messages` | JSONB | 메시지 배열 `[{role, content}]` |
| `context_type` | TEXT | `tech_analysis` / `learning` / `general` / `project_walkthrough` |
| `llm_provider` | TEXT | 사용된 LLM |
| `total_tokens` | INTEGER | 총 토큰 사용량 |

#### `mcp_sessions` — MCP 세션 로그

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `user_id` | UUID (FK) | users.id, CASCADE |
| `project_id` | UUID (FK) | projects.id, CASCADE |
| `client_tool` | TEXT | 클라이언트 이름 (Claude Code 등) |
| `client_version` | TEXT | 클라이언트 버전 |
| `session_start` | TIMESTAMPTZ | 세션 시작 |
| `session_end` | TIMESTAMPTZ | 세션 종료 |
| `tools_called` | JSONB | 호출된 MCP 도구 로그 |
| `files_synced` | INTEGER | 동기화된 파일 수 |
| `is_active` | BOOLEAN | 활성 세션 여부 |

### 5.3 인덱스

```sql
idx_projects_user_id        ON projects(user_id)
idx_projects_status         ON projects(status)
idx_tech_stacks_project_id  ON tech_stacks(project_id)
idx_tech_stacks_category    ON tech_stacks(category)
idx_learning_progress_user  ON learning_progress(user_id, status)
idx_analysis_jobs_status    ON analysis_jobs(status, created_at)
idx_mcp_sessions_user       ON mcp_sessions(user_id, is_active)
idx_project_files_hash      ON project_files(content_hash)
idx_user_api_keys_user      ON user_api_keys(user_id, is_active)
```

### 5.4 RLS 정책

모든 12개 테이블에 RLS가 활성화되어 있다. 정책은 `auth.uid() = user_id` 패턴으로 사용자가 자신의 데이터만 접근할 수 있도록 한다.

| 테이블 | 정책 | 접근 조건 |
|--------|------|----------|
| `users` | `users_own_data` | `auth.uid() = id` |
| `user_api_keys` | `own_api_keys` | `auth.uid() = user_id` |
| `user_llm_keys` | `own_llm_keys` | `auth.uid() = user_id` |
| `projects` | `own_projects` | `auth.uid() = user_id` |
| `project_files` | `own_project_files` | 소유 프로젝트의 파일만 |
| `tech_stacks` | `own_tech_stacks` | 소유 프로젝트의 스택만 |
| `analysis_jobs` | `own_analysis_jobs` | `auth.uid() = user_id` |
| `learning_paths` | `own_learning_paths` | `auth.uid() = user_id` |
| `learning_modules` | `own_learning_modules` | 소유 학습 경로의 모듈만 |
| `learning_progress` | `own_learning_progress` | `auth.uid() = user_id` |
| `ai_conversations` | `own_ai_conversations` | `auth.uid() = user_id` |
| `mcp_sessions` | `own_mcp_sessions` | `auth.uid() = user_id` |

**서비스 클라이언트:** `createServiceClient()`는 `service_role` 키를 사용하여 RLS를 우회한다. Server Action에서만 사용한다.

---

## 6. API 설계

### 6.1 외부 API (`/api/v1/*`)

Bearer 토큰 인증이 필요하다. 응답 형식: `{ success: boolean, data?: T, error?: string }`

#### 프로젝트

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/v1/projects` | 프로젝트 생성/업서트 |
| GET | `/api/v1/projects` | 프로젝트 목록 |
| GET | `/api/v1/projects/:id` | 프로젝트 상세 (파일, 스택 포함) |
| DELETE | `/api/v1/projects/:id` | 프로젝트 삭제 |
| POST | `/api/v1/projects/:id/files` | 파일 업로드 (암호화 저장) |
| POST | `/api/v1/projects/:id/analyze` | 기술 분석 트리거 (비동기) |
| GET | `/api/v1/projects/:id/stack` | 분석 결과 조회 |

#### 학습

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/v1/learning/generate` | 학습 로드맵 생성 (2-Phase) |
| GET | `/api/v1/learning/paths?project_id=X` | 학습 경로 목록 |
| GET | `/api/v1/learning/paths/:id` | 경로 상세 (모듈 포함) |
| GET | `/api/v1/learning/modules/:id` | 모듈 콘텐츠 |
| POST | `/api/v1/learning/progress` | 진도 업데이트 |
| POST | `/api/v1/learning/chat` | AI 튜터 대화 |
| GET | `/api/v1/learning/chat/:conversationId` | 대화 히스토리 |

#### 기타

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/v1/health` | 헬스체크 |

### 6.2 내부 API

| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/api/auth/signout` | Session | 로그아웃 |
| POST | `/api/stripe/checkout` | Session | Stripe 체크아웃 생성 |
| GET | `/api/stripe/portal` | Session | Stripe 포털 접근 |
| POST | `/api/stripe/webhook` | Stripe Signature | Webhook 처리 |

### 6.3 Server Actions

| 파일 | 함수 | 설명 |
|------|------|------|
| `projects.ts` | `deleteProject()` | 프로젝트 삭제 (cascade) |
| `projects.ts` | `startAnalysis()` | 분석 트리거 |
| `projects.ts` | `getProjectDetail()` | 프로젝트 상세 조회 |
| `learning.ts` | `generateLearningPath()` | 2-Phase 학습 경로 생성 |
| `learning.ts` | `getLearningPaths()` | 경로 목록 |
| `learning.ts` | `getLearningPathDetail()` | 경로 상세 + 모듈 + 진도 |
| `learning.ts` | `getLearningModule()` | 모듈 콘텐츠 + 진도 |
| `learning.ts` | `updateLearningProgress()` | 진도 업데이트 |
| `learning.ts` | `sendTutorMessage()` | AI 튜터 메시지 |
| `learning.ts` | `getChatHistory()` | 대화 히스토리 |
| `learning.ts` | `listConversations()` | 대화 목록 |
| `dashboard.ts` | `getDashboardStats()` | 대시보드 통계 |
| `api-keys.ts` | `createApiKey()` | API 키 생성 |
| `api-keys.ts` | `listApiKeys()` | API 키 목록 |
| `api-keys.ts` | `revokeApiKey()` | API 키 비활성화 |
| `llm-keys.ts` | `saveLlmKey()` | LLM 키 저장 (암호화) |
| `llm-keys.ts` | `listLlmKeys()` | LLM 키 목록 |
| `llm-keys.ts` | `validateLlmKey()` | LLM 키 검증 |
| `llm-keys.ts` | `getDefaultLlmKeyForUser()` | 기본 LLM 키 조회 |
| `billing.ts` | `createCheckoutSession()` | Stripe 세션 생성 |
| `billing.ts` | `getCurrentPlan()` | 현재 플랜 조회 |

### 6.4 Rate Limiting

`middleware.ts`에서 Edge Middleware로 구현한다.

| 대상 경로 | 키 | 제한 | 이유 |
|-----------|-----|------|------|
| `/api/v1/*` | Bearer 토큰 또는 IP | 60 req/min | 일반 API |
| `/api/auth/*` | IP | 10 req/min | 브루트포스 방지 |
| `/api/stripe/*` | IP | 20 req/min | Webhook 여유 |

초과 시 `429 Too Many Requests` + `Retry-After`, `X-RateLimit-*` 헤더 반환.

---

## 7. 인증 및 보안

### 7.1 인증 체계

```
┌──────────────────────┐
│    인증 방식          │
├──────────────────────┤
│ 웹 사용자:           │
│   Supabase Auth      │
│   - Email/Password   │
│   - GitHub OAuth     │
│   - Google OAuth     │
│   - JWT 세션 관리    │
├──────────────────────┤
│ 외부 API:            │
│   API Key (Bearer)   │
│   - vs_ prefix       │
│   - bcrypt 해시 비교 │
│   - prefix 매칭 후   │
│     full hash 검증   │
└──────────────────────┘
```

### 7.2 암호화

| 대상 | 방식 | 저장 형식 |
|------|------|----------|
| VibeUniv API 키 | bcrypt (단방향 해시) | `key_hash` 컬럼 |
| 사용자 LLM API 키 | AES-256-GCM (양방향 암호화) | `iv:tag:encrypted` (hex) |
| 파일 콘텐츠 | AES-256-GCM (양방향 암호화) | `raw_content` 컬럼 |

**ENCRYPTION_KEY:** 32바이트 hex 문자열, 환경변수로 관리

### 7.3 보안 헤더

`next.config.ts`에서 CDN 레벨로 적용 (성능 비용 0):

| 헤더 | 값 | 목적 |
|------|-----|------|
| `X-Frame-Options` | `DENY` | 클릭재킹 방지 |
| `X-Content-Type-Options` | `nosniff` | MIME 스니핑 방지 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer 제어 |
| `X-DNS-Prefetch-Control` | `on` | DNS 프리페치 |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS 강제 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 권한 제한 |

### 7.4 데이터 접근 제어

- **RLS:** 모든 12개 테이블에 Row Level Security 적용
- **Service Client:** `SUPABASE_SERVICE_ROLE_KEY`를 사용하는 서버 전용 클라이언트 — Server Action에서만 사용
- **Cascade Delete:** 프로젝트 삭제 시 파일, 분석, 학습 경로, 대화, 세션 모두 자동 삭제

### 7.5 민감 파일 제외

MCP 서버 파일 스캐너에서 자동 제외하는 파일:
- `.env*`, `*.pem`, `*.key`, `id_rsa*`
- `credentials.json`, `*.p12`, `*.pfx`
- `node_modules/`, `.git/`, `dist/`, `build/`

---

## 8. LLM 통합 시스템

### 8.1 Provider 인터페이스

```typescript
interface LLMProvider {
  readonly providerName: string;
  readonly modelName: string;
  analyze(input: AnalysisInput): Promise<AnalysisOutput>;
  chat(input: ChatInput): Promise<ChatOutput>;
}
```

### 8.2 지원 프로바이더 (11개)

| 프로바이더 | 어댑터 | 기본 모델 |
|-----------|--------|----------|
| **Anthropic** | `AnthropicProvider` | claude-sonnet-4-20250514 |
| **Google** | `GoogleProvider` | gemini-2.0-flash |
| **Cohere** | `CohereProvider` | command-r-plus |
| **OpenAI** | `OpenAICompatibleProvider` | gpt-4o |
| **Groq** | `OpenAICompatibleProvider` | llama-3.3-70b-versatile |
| **Mistral** | `OpenAICompatibleProvider` | mistral-large-latest |
| **DeepSeek** | `OpenAICompatibleProvider` | deepseek-chat |
| **Together** | `OpenAICompatibleProvider` | meta-llama/Llama-3.3-70B-Instruct-Turbo |
| **Fireworks** | `OpenAICompatibleProvider` | accounts/fireworks/models/llama-v3p3-70b-instruct |
| **xAI** | `OpenAICompatibleProvider` | grok-2-latest |
| **OpenRouter** | `OpenAICompatibleProvider` | anthropic/claude-sonnet-4 |

### 8.3 Factory 패턴

```typescript
createLLMProvider(provider: LlmProviderName, apiKey: string): LLMProvider
```

`lib/llm/factory.ts`에서 프로바이더명을 받아 적절한 어댑터 인스턴스를 생성한다.

### 8.4 프롬프트 관리

| 파일 | 용도 |
|------|------|
| `lib/prompts/tech-analysis.ts` | 기술 스택 분석 프롬프트 |
| `lib/prompts/learning-roadmap.ts` | 학습 로드맵 생성 (Phase 1 구조 + Phase 2 콘텐츠) |
| `lib/prompts/tutor-chat.ts` | AI 튜터 시스템 프롬프트 |

---

## 9. 핵심 비즈니스 로직

### 9.1 프로젝트 분석 파이프라인

```
[파일 업로드] → [파일 파싱] → [기술 힌트 추출] → [LLM 분석] → [결과 저장]
```

**상세 흐름:**

1. MCP/API를 통해 파일 업로드 (`POST /api/v1/projects/:id/files`)
2. 파일 타입 분류 (`dependency`, `ai_config`, `build_config`, `source_code`, `other`)
3. 파일 콘텐츠 암호화 후 DB 저장
4. 프로젝트 다이제스트 자동 생성 (파일 트리, 의존성, 아키텍처 패턴)
5. 분석 트리거 시 (`POST /api/v1/projects/:id/analyze`):
   - `analysis_jobs` 레코드 생성 (status: `pending`)
   - 사용자 LLM 키 조회 (BYOK) 또는 기본 프로바이더 사용
   - 파일 복호화 → 기술 힌트 추출 → LLM 분석 프롬프트 생성
   - LLM 호출 → JSON 응답 파싱 → `tech_stacks` 테이블에 upsert
   - 프로젝트 상태 업데이트 (`analyzing` → `analyzed`)
   - 토큰 사용량 기록

### 9.2 학습 경로 생성 (2-Phase)

```
[Phase 1: 구조 생성] → [Phase 2: 콘텐츠 배치 생성]
```

**Phase 1 — 구조:**
- 입력: 기술 스택 + 프로젝트 다이제스트 + 난이도
- 출력: 경로 제목, 설명, 모듈 스켈레톤 (제목, 타입, 기술, 학습 목표, 관련 파일)
- 콘텐츠는 생성하지 않음 (효율성)

**Phase 2 — 콘텐츠:**
- 기술별 배치 생성: 같은 기술의 모듈들을 묶어서 한 번에 생성
- 입력: 모듈 정보 + 해당 기술 관련 소스 코드
- 출력: 설명, 코드 예제, 퀴즈, 챌린지 섹션
- 매칭 로직: 정확한 제목 → 정규화된 제목 → 인덱스 폴백

**언어:** 모든 학습 콘텐츠는 한국어(Korean)로 생성

### 9.3 AI 튜터

- 프로젝트의 실제 소스 코드를 컨텍스트로 활용
- 상위 10개 파일 + 기술 스택 + 학습 경로 정보를 시스템 프롬프트에 포함
- 대화 히스토리 유지 (JSONB)
- 토큰 사용량 추적
- 최대 ~500단어 응답

### 9.4 프로젝트 다이제스트

`lib/analysis/digest-generator.ts`에서 생성:

- 파일 트리 구조
- 의존성 목록 (npm, pip)
- ES import 분석
- Next.js 라우트 감지
- 아키텍처 패턴 감지 (next-app-router, server-components, supabase-auth 등)

---

## 10. MCP 서버

### 10.1 아키텍처

MCP 서버는 **별도의 서버 프로세스가 아니다.** 사용자의 IDE 안에서 stdio 프로세스로 실행되며, Next.js 앱의 REST API를 호출하는 **HTTP 클라이언트**다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    사용자 PC (로컬)                               │
│                                                                  │
│  ┌──────────────┐     stdio      ┌─────────────────────────┐   │
│  │  IDE          │◄─────────────►│  MCP Server             │   │
│  │  Claude Code  │  MCP Protocol │  (@vibestack/mcp-server)│   │
│  │  Cursor       │               │                         │   │
│  │  Windsurf     │               │  - 파일 스캔            │   │
│  └──────────────┘               │  - 프로젝트 구조 분석   │   │
│                                  └────────────┬────────────┘   │
│                                               │                 │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
                                    HTTPS fetch │ Bearer vs_xxx
                                    /api/v1/*   │
                                                │
┌───────────────────────────────────────────────▼─────────────────┐
│                  Vercel (vibeuniv.com)                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Next.js App (port 3000)                                 │    │
│  │                                                          │    │
│  │  /api/v1/projects      ← MCP가 호출하는 동일한 API     │    │
│  │  /api/v1/projects/:id/files                              │    │
│  │  /api/v1/projects/:id/analyze                            │    │
│  │  /api/v1/learning/*                                      │    │
│  │  ...                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

**핵심 포인트:**
- MCP 서버는 네트워크 포트를 열지 않는다 (stdio 전송만 사용)
- Next.js 앱과 동일한 `/api/v1/*` 엔드포인트를 호출한다
- 별도 백엔드가 아니라 REST API의 클라이언트 역할이다
- 기본 URL은 `https://vibeuniv.com/api/v1`, 로컬 테스트 시 `http://localhost:3000/api/v1`

### 10.2 개요

| 항목 | 값 |
|------|-----|
| 패키지명 | `@vibestack/mcp-server` |
| 바이너리 | `vibestack-mcp` |
| 프로토콜 | MCP (Model Context Protocol) |
| 전송 | StdioServerTransport (네트워크 포트 사용 안 함) |
| 의존성 | `@modelcontextprotocol/sdk`, `glob`, `zod` |
| API 통신 | Next.js `/api/v1/*`에 HTTP fetch (Bearer 인증) |

### 10.3 MCP 도구 (6개)

모든 도구는 내부적으로 `VibeStackClient`(`packages/mcp-server/src/lib/api-client.ts`)를 통해 Next.js REST API를 호출한다.

| 도구 | 호출하는 API | 설명 |
|------|-------------|------|
| `vibeuniv_sync_project` | `POST /api/v1/projects` | 프로젝트 폴더 스캔 → 메타데이터 업로드 |
| `vibeuniv_upload_files` | `POST /api/v1/projects/:id/files` | 소스/설정 파일 업로드 |
| `vibeuniv_analyze` | `POST /api/v1/projects/:id/analyze` | 기술 스택 분석 트리거 |
| `vibeuniv_get_learning` | `GET /api/v1/learning/paths` | 학습 경로 조회 |
| `vibeuniv_ask_tutor` | `POST /api/v1/learning/chat` | AI 튜터에게 질문 |
| `vibeuniv_log_session` | `POST /api/v1/projects/:id/sessions` | MCP 세션 활동 로그 |

### 10.4 파일 스캐너 특징

- 소스 파일은 헤더만 추출 (업로드 크기 최소화)
- "교육 핵심 파일"은 전체 콘텐츠 보존 (pages, layouts, middleware, types, server 코드)
- 민감 파일 자동 제외 (`.env*`, `*.pem`, `*.key`, `credentials.json` 등)
- 프로젝트당 최대 50개 소스 파일

### 10.5 환경변수

```
VIBEUNIV_API_KEY=vs_xxxxxxxxxxxxxxxx
VIBEUNIV_API_URL=https://vibeuniv.com/api/v1   # (기본값, 생략 가능)
```

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `VIBEUNIV_API_KEY` | O | - | 사용자 API 키 (Settings에서 발급) |
| `VIBEUNIV_API_URL` | X | `https://vibeuniv.com/api/v1` | API 서버 주소 |

로컬 개발 시에는 `VIBEUNIV_API_URL=http://localhost:3000/api/v1`로 설정하면 로컬 Next.js 서버를 사용한다.

---

## 11. 과금 시스템

### 11.1 플랜 구성

| 플랜 | 가격 | 프로젝트 | AI 대화 | 학습 로드맵 | 특별 기능 |
|------|------|---------|---------|------------|----------|
| **Free** | $0 | 3개 | 20회/월 | 1개/월 | - |
| **Pro** | $19/월 | 무제한 | 무제한 | 무제한 | BYOK (자체 LLM 키) |
| **Team** | $49/월 | 무제한 | 무제한 | 무제한 | Pro + 팀 공유 + 우선순위 |

### 11.2 사용량 제한 체크

`lib/utils/usage-limits.ts`에서 `checkUsageLimit()` 함수로 제한을 확인한다:

| 액션 | Free 제한 | 측정 기준 |
|------|----------|----------|
| `analysis` | 3 | 총 프로젝트 수 |
| `learning` | 1 | 월별 학습 경로 생성 수 |
| `chat` | 20 | 월별 AI 대화 수 |

Pro/Team 사용자는 모든 제한이 해제된다.

### 11.3 Stripe 통합

- **체크아웃:** `server/actions/billing.ts` → Stripe Checkout Session 생성
- **Webhook:** `app/api/stripe/webhook/route.ts` → 구독 상태 변경 처리
- **포털:** Stripe Customer Portal로 구독 관리
- **이벤트:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 12. 프론트엔드 구조

### 12.1 페이지 구성

| 경로 | 페이지 | 인증 |
|------|--------|------|
| `/` | 랜딩 페이지 (히어로, 기능, 가격, FAQ) | X |
| `/guide` | 8단계 온보딩 가이드 | X |
| `/login` | 로그인 (이메일 + OAuth) | X |
| `/signup` | 회원가입 | X |
| `/dashboard` | 메인 대시보드 (통계, 최근 프로젝트, 차트) | O |
| `/projects` | 프로젝트 목록 | O |
| `/projects/:id` | 프로젝트 상세 (파일, 분석, 정보) | O |
| `/learning` | 학습 경로 목록 + 생성기 | O |
| `/learning/:pathId` | 학습 경로 상세 (모듈 리스트) | O |
| `/learning/:pathId/:moduleId` | 모듈 콘텐츠 뷰어 | O |
| `/settings` | 설정 (API 키, LLM 키) | O |
| `/settings/billing` | 구독 관리 | O |

### 12.2 컴포넌트

**UI 컴포넌트 (`components/ui/`):**

| 컴포넌트 | 설명 |
|----------|------|
| `Button` | 버튼 (primary, secondary, ghost, danger 변형) |
| `Card` | 카드 컨테이너 (Header, Title, Description, Content) |
| `Input` | 폼 입력 (레이블, 에러 표시) |
| `Loading` | 로딩 스피너 |
| `Sidebar` | 반응형 네비게이션 사이드바 |

**기능 컴포넌트 (`components/features/`):**

| 컴포넌트 | 설명 |
|----------|------|
| `ProjectCard` | 프로젝트 카드 (상태, 기술 배지) |
| `ProjectAnalysis` | 분석 결과 UI (uploaded/analyzing/analyzed/error 상태) |
| `TechStackBadge` | 기술 스택 배지 |
| `TechChart` | 기술 분포 바 차트 (recharts) |
| `LearningPathCard` | 학습 경로 카드 (진도 바) |
| `LearningGenerator` | 학습 경로 생성 폼 |
| `ModuleContent` | 모듈 콘텐츠 뷰어 (퀴즈, 챌린지, 설명 섹션) |
| `TutorChat` | AI 튜터 채팅 인터페이스 |
| `ApiKeyManager` | API 키 관리 (생성, 삭제, 비활성화) |
| `LlmKeyManager` | LLM 키 관리 (11개 프로바이더, 검증) |
| `BillingManager` | 구독 플랜 카드 |
| `DeleteProjectButton` | 프로젝트 삭제 확인 다이얼로그 |

### 12.3 디자인 시스템

- **스타일링:** Tailwind CSS v4 only (별도 CSS 파일 없음)
- **컬러:** zinc 모노크롬 (화려한 색상 X)
- **아이콘:** lucide-react
- **톤:** 캐주얼하고 트렌디한 학습 플랫폼
- **컴포넌트 기본:** Server Component → 상태 필요 시에만 `'use client'`

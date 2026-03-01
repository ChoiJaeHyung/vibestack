# CLAUDE.md — VibeUniv 프로젝트 컨텍스트

## 프로젝트 개요
VibeUniv(vibeuniv.com)는 바이브 코더(Vibe Coder)들이 AI로 만든 프로젝트의 기술 스택을 이해하고 학습할 수 있도록 돕는 플랫폼이다.

**핵심 가치:** "만들었으면 반은 왔어요. 나머지 반, 여기서 채워요"
- 바이브 코더가 코딩 도구(Claude Code, Cursor, Bolt 등)로 앱을 만든다
- VibeUniv MCP 서버를 통해 프로젝트 데이터를 자동 수집한다
- AI가 기술 스택을 분석하고 맞춤 학습 로드맵을 생성한다
- AI 튜터와 함께 실제 프로젝트 기반으로 학습한다

## 브랜딩
- **서비스명:** VibeUniv (VibeStack에서 리브랜딩됨)
- **도메인:** vibeuniv.com
- **로고 아이콘:** GraduationCap (lucide-react)
- **톤:** 캐주얼하고 트렌디한 학습 플랫폼. 부담 없고 가볍고 재밌어 보이는 느낌
- **디자인:** CSS 변수 기반 라이트/다크 모드 지원 (next-themes). 기본 다크 모드, 토글로 전환
- **GitHub repo:** ChoiJaeHyung/vibestack (레포명은 그대로)

## 기술 스택 (절대 변경 금지)
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Multi-LLM (Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek 등)
- **MCP:** @modelcontextprotocol/sdk (TypeScript)
- **Deploy:** Vercel
- **Payments:** 토스페이먼츠 (TossPayments)

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
│   └── mcp-server/         # @vibeuniv/mcp-server (npm 패키지)
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
- MCP Tool 이름: snake_case with prefix (`vibeuniv_sync_project`)

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
NEXT_PUBLIC_TOSS_CLIENT_KEY=     # 토스페이먼츠 클라이언트 키
TOSS_SECRET_KEY=                # 토스페이먼츠 시크릿 키
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
- Free: 3 프로젝트, 기본 분석, 월 1회 학습 로드맵, 월 20회 AI 대화
- Pro (₩25,000/월): 무제한 프로젝트, 심화 분석, 무제한 로드맵/AI 대화, BYOK
- Team (₩59,000/월): Pro + 팀 공유 + 우선 지원

## Git 워크플로우
- main 브랜치 직접 push 금지 (hook으로 차단됨)
- 기능 브랜치 생성 → PR → merge 방식으로 진행
- 브랜치 네이밍: `feature/`, `fix/`, `rebrand/` 등 prefix 사용

## 테스트 계정
- **Email:** test@vibestack.dev
- **Password:** testpass123

## 프로젝트 구조 요약

> 상세한 스키마/로직은 `research.md` 참조

### 핵심 파일 위치 맵

| 영역 | 경로 | 설명 |
|------|------|------|
| **페이지** | `app/(dashboard)/` | 대시보드, 프로젝트, 학습, 설정 |
| **외부 API** | `app/api/v1/` | MCP/CLI용 API 키 인증 |
| **내부 API** | `app/api/dashboard/`, `app/api/usage/` 등 | 세션 인증 |
| **결제 API** | `app/api/payments/` | 토스페이먼츠 연동 |
| **Server Actions** | `server/actions/` | 핵심 비즈니스 로직 |
| **LLM 어댑터** | `lib/llm/` | 멀티 LLM Provider 팩토리 |
| **파일 분석** | `lib/analysis/` | 파일 파싱, 다이제스트 생성, tech-stack upsert 유틸 |
| **학습 시스템** | `lib/learning/`, `lib/prompts/` | 커리큘럼 생성 (2-Phase), 상세 콘텐츠 + 인용 링크, 퀴즈 점수 추적(최고점 유지), 콘텐츠 검증 + retry |
| **AI 튜터 패널** | `components/features/tutor-panel*.tsx`, `tutor-search.tsx`, `dashboard-main.tsx` | 우측 슬라이드 패널 (채팅/검색 탭), 텍스트 선택→AI 질문, Google 검색 |
| **KB 시스템** | `lib/knowledge/` | 3-Tier 지식 베이스 |
| **프롬프트** | `lib/prompts/` | LLM 프롬프트 템플릿 |
| **보안** | `lib/utils/encryption.ts`, `content-encryption.ts` | AES-256-GCM 암호화, 콘텐츠 복호화 |
| **보안 헤더** | `next.config.ts` | CSP, HSTS, X-Frame-Options 등 |
| **SEO** | `app/opengraph-image.tsx`, `twitter-image.tsx`, `not-found.tsx` | OG 이미지, 404 페이지 |
| **MCP 서버** | `packages/mcp-server/src/` | 10개 MCP 도구 (v0.3.0, Local-First) |
| **DB 타입** | `types/database.ts` | Supabase 전체 스키마 타입 |
| **마이그레이션** | `supabase/migrations/` | 001~009 SQL |

### DB 테이블 (18개)

**사용자**: `users`, `user_api_keys`, `user_llm_keys`
**프로젝트**: `projects`, `project_files`, `tech_stacks`, `analysis_jobs`, `educational_analyses`
**학습**: `learning_paths`, `learning_modules`, `learning_progress`
**AI/MCP**: `ai_conversations`, `mcp_sessions`
**어드민**: `system_settings`, `announcements`, `admin_audit_log`
**결제**: `payments`
**KB**: `technology_knowledge`

### 핵심 데이터 플로우

1. **프로젝트 분석 (웹)**: 파일 업로드 → file-parser → digest-generator(`after()` 백그라운드) → LLM 분석 → tech_stacks 저장
2. **프로젝트 분석 (MCP, Local-First)**: analyze → 서버에서 파일 fetch → 로컬 AI 분석 → submit_tech_stacks → 서버 저장 (서버 LLM 0)
3. **커리큘럼 생성 (2-Phase, 웹)**: Phase 1: 구조 생성(LLM) → Phase 2: 기술별 콘텐츠 생성(LLM+KB) → 콘텐츠 검증(`_validateGeneratedSections(sections, difficulty)`: beginner→최소 5섹션, 400자↑ / 그 외→최소 3섹션, 200자↑, code+quiz 필수) → 실패 시 최대 3회 retry 후 `validation_failed`. beginner maxTokens 24000*n (1.5배)
4. **커리큘럼 생성 (MCP, Local-First)**: curriculum-context API(tech stacks+KB+edu analysis+파일 소스코드 20개/8000자) → 로컬 AI 생성(최소 15모듈, 프로젝트 기능 중심) → submit_curriculum(검증: 최소 10모듈, beginner→5섹션/모듈+400자↑ / 그 외→3섹션/모듈+200자↑, code+quiz 각각 필수, quiz_explanation 필수, challenge starter/answer_code 필수)
5. **AI 튜터 (웹)**: 프로젝트 파일 + 기술 스택 + 현재 모듈 콘텐츠 서머리(6000자) → 시스템 프롬프트(해요체) → LLM 대화
6. **AI 튜터 (MCP, Local-First)**: tutor-context → 로컬 AI가 직접 답변 (서버 LLM 0)
7. **결제**: createPaymentRequest → 토스 결제 → confirm (금액 검증 + secret 저장) → plan_type 업데이트
8. **웹훅**: 토스 웹훅 → secret 비교 검증 → 결제 상태 동기화

### LLM Provider (11개)

Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek, Cohere, Together, Fireworks, XAI, OpenRouter
- 팩토리 패턴: `lib/llm/factory.ts` → `createLLMProvider(provider, apiKey)`
- BYOK: 사용자 키 AES-256-GCM 암호화 저장/복호화

### MCP 도구 (10개, v0.3.0)

`vibeuniv_sync_project`, `vibeuniv_upload_files`, `vibeuniv_analyze`, `vibeuniv_submit_tech_stacks`, `vibeuniv_get_learning`, `vibeuniv_ask_tutor`, `vibeuniv_log_session`, `vibeuniv_submit_analysis`, `vibeuniv_generate_curriculum`, `vibeuniv_submit_curriculum`

> **Local-First 패턴**: `analyze`, `ask_tutor`, `generate_curriculum`은 서버 LLM을 호출하지 않고 로컬 AI에게 지침을 반환한다. 결과는 companion 도구로 서버에 저장.

---

## 작업 규약 (필수 준수)

### 1. 계획 수립 → 승인 → 실행 프로세스

**모든 비자명(non-trivial) 작업은 반드시 아래 프로세스를 따른다:**

#### Step 1: 분석 및 계획 수립
- 관련 파일을 먼저 읽고 현재 코드를 이해한다
- `research.md`를 참조하여 기존 구조/스키마를 파악한다
- 영향 범위(어떤 파일/테이블/API가 변경되는지)를 분석한다

#### Step 2: TODO 리스트 작성 및 제안
- 상세한 TODO 리스트를 사용자에게 제시한다:
  ```
  ## 작업 계획: [제목]

  ### 영향 분석
  - 변경 파일: [목록]
  - 변경 테이블: [목록]
  - 신규 파일: [목록]

  ### TODO
  1. [ ] 구체적 작업 1
  2. [ ] 구체적 작업 2
  3. [ ] ...

  ### 위험 요소
  - [잠재적 문제점]
  ```
- 여러 접근 방식이 가능한 경우, 각각의 장단점을 제시한다

#### Step 3: 사용자 승인 대기
- **반드시 사용자의 명시적 승인("ㅇㅇ", "진행해", "OK" 등)을 받은 후에만 코드 수정을 시작한다**
- 승인 없이 코드를 수정하지 않는다 (읽기/분석은 가능)
- 사용자가 수정 요청을 하면 계획을 업데이트하고 다시 승인을 받는다

#### Step 4: 실행
- 승인된 TODO 리스트 순서대로 작업한다
- 각 TODO 완료 시 진행 상황을 보고한다
- 예상치 못한 문제 발생 시 즉시 사용자에게 알리고 방향을 확인한다
- **작업 완료 후 반드시 `research.md`와 `CLAUDE.md`의 관련 섹션을 업데이트한다** (아래 3번 규칙 참조)

### 2. 예외: 즉시 실행 가능한 작업
다음은 계획 수립 없이 바로 실행해도 된다:
- 단순 오타 수정
- 1-2줄 수준의 명확한 버그 수정
- 파일 읽기/구조 탐색/질문 답변
- 사용자가 "바로 해줘" 등으로 즉시 실행을 명시한 경우

### 3. 문서 자동 동기화 (필수)

**코드 변경 시 `research.md`와 `CLAUDE.md`를 반드시 함께 업데이트한다. 이것은 선택이 아닌 의무다.**

#### 업데이트 트리거 → 대상 매핑

| 변경 내용 | research.md 업데이트 대상 | CLAUDE.md 업데이트 대상 |
|-----------|--------------------------|------------------------|
| DB 마이그레이션 추가/수정 | 섹션 2 (스키마) 전체: 테이블, 컬럼, FK, RLS | DB 테이블 목록, 테이블 수 |
| Server Action 추가/수정 | 섹션 3.x (해당 로직 플로우) | 핵심 파일 위치 맵 |
| API 라우트 추가/수정 | 섹션 1 (디렉토리 구조) + 관련 플로우 | 핵심 파일 위치 맵 |
| 컴포넌트 추가/수정 | 섹션 1 (디렉토리 구조) | - |
| LLM Provider 추가/수정 | 섹션 3.10 (LLM Provider) | LLM Provider 목록 |
| MCP 도구 추가/수정 | 섹션 3.7 (MCP 도구) | MCP 도구 목록 |
| 프롬프트 변경 | 관련 플로우 섹션 | - |
| 결제/과금 로직 변경 | 섹션 3.6 (결제), 3.9 (사용량) | 과금 모델 |
| 환경변수 추가 | - | 환경변수 섹션 |
| 보안/인증 로직 변경 | 섹션 4 (보안 아키텍처) | - |
| 새 페이지 라우트 추가 | 섹션 1 (디렉토리 구조) | - |
| types/ 타입 변경 | 섹션 5 (타입 정의) | - |
| KB 시드 데이터 추가 | 섹션 3.8 (KB 시스템) | - |

#### 업데이트 절차
1. 코드 변경 완료 후, 위 매핑 테이블을 확인한다
2. 해당하는 섹션을 `research.md`에서 찾아 업데이트한다
3. `CLAUDE.md`의 요약 섹션도 필요 시 업데이트한다
4. 문서 업데이트를 빠뜨린 경우, 다음 작업 시작 전에 보완한다

### 4. 배포 전 검증 규약 (필수)

**모든 코드 변경 후, PR/배포 전에 반드시 아래 검증 절차를 수행한다. 이것은 선택이 아닌 의무다.**

#### Step 1: 빌드 검증
- `npx next build` 실행하여 빌드 성공 확인
- TypeScript 타입 에러, 빌드 에러가 없어야 한다
- 빌드 실패 시 수정 후 다시 빌드할 것

#### Step 2: 영향 범위 검증
- 변경된 페이지를 브라우저(Playwright)로 직접 확인한다
- 라이트/다크 모드 모두에서 깨지는 UI가 없는지 확인한다
- API 변경 시 관련 엔드포인트가 정상 동작하는지 확인한다

#### Step 3: 보안 체크리스트
- [ ] `dangerouslySetInnerHTML` 사용 시 입력값 새니타이즈 확인
- [ ] 사용자 입력이 DB 쿼리에 들어갈 때 파라미터화 확인
- [ ] 새 API 라우트에 인증 체크 존재 확인
- [ ] 환경변수에 민감 정보가 `NEXT_PUBLIC_` prefix로 노출되지 않는지 확인
- [ ] 새 테이블에 RLS 적용 확인

#### Step 4: 문서 동기화
- 위 3번(문서 자동 동기화) 규약에 따라 `research.md`와 `CLAUDE.md` 업데이트
- 마이그레이션 추가 시 마이그레이션 히스토리 테이블 업데이트
- 새 컴포넌트/페이지 추가 시 디렉토리 구조 업데이트

#### 검증 생략 가능한 경우
- 문서만 수정한 경우 (빌드 검증 불필요)
- 주석/타입 주석만 수정한 경우
- 사용자가 "검증 생략해" 등으로 명시한 경우

---

## 현재 진행 상황
- [x] Phase 1: 프로젝트 초기 설정
- [x] Phase 2: MCP 서버 개발
- [x] Phase 3: 프로젝트 수집 + 파일 파싱
- [x] Phase 4: 멀티 LLM + AI 분석 엔진
- [x] Phase 5: 학습 시스템
- [x] Phase 6: 대시보드 + 결제 + 출시
- [x] VibeStack → VibeUniv 리브랜딩 (PR #2)
- [x] Phase A: MCP Local-First Refactoring (서버 LLM 호출 99.5% 제거)
- [x] UI 리디자인 + 토스페이먼츠 결제 (PR #44)
- [x] 랜딩 페이지 로그아웃 버튼 (PR #45)
- [x] 라이트/다크 모드 + 테마 토글 (PR #44에 포함)
- [x] SEO 최적화: OG 이미지, 404, 메타데이터, JSON-LD, 폰트 최적화 (PR #47)
- [x] 보안 감사 + 14개 취약점 수정 (PR #48)
- [x] 토스 웹훅 검증 방식 수정: HMAC → secret 비교 (PR #49)
- [x] 학습 콘텐츠 품질 개선 (프롬프트: 상세 설명, 인용 링크, 코드 라인별 설명) + AI 튜터 우측 슬라이드 패널 + 텍스트 선택→AI 질문
- [x] 프로젝트 연동 속도 개선 (파일 업로드 다이제스트 `after()` 백그라운드) + 커리큘럼 컨텍스트에 소스코드 추가 + 커리큘럼 지시문/검증 강화 (최소 10모듈, 3섹션/모듈, code/quiz 필수)
- [x] 학습 콘텐츠 품질 대폭 강화: 라이트모드 렌더링 수정, 퀴즈 점수 DB 저장(최고점 유지+시간 누적), MCP/웹 콘텐츠 검증 강화(explanation 200자↑, code+quiz 각각 필수, retry 최대 3회), MCP JSON 스키마 포맷 개선, AI 튜터에 모듈 콘텐츠 서머리 전달(6000자), 전체 프롬프트 해요체 톤 강화
- [x] 초급(beginner) 콘텐츠 "5~6세 수준" 강화: 3단계 개념 쪼개기(비유→정의→코드), before/after 비교, 코드 우리말 번역, 비유 퀴즈 50%+, beginner 검증 강화(5섹션↑/400자↑), maxTokens 1.5배(24000*n), MCP 지시문 동적화

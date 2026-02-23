# VibeUniv 프로젝트 운영 지침서

> **최종 업데이트:** 2026-02-23
> **대상 독자:** 개발자, 운영자

---

## 목차

1. [환경 설정](#1-환경-설정)
2. [로컬 개발](#2-로컬-개발) — `npm run dev:full`, MCP 로컬 테스트
3. [Git 워크플로우](#3-git-워크플로우)
4. [배포](#4-배포) — `npm run deploy` 원스톱 배포, 수동 배포, 롤백
5. [데이터베이스 관리](#5-데이터베이스-관리)
6. [보안 운영](#6-보안-운영)
7. [모니터링 및 로깅](#7-모니터링-및-로깅)
8. [MCP 서버 관리](#8-mcp-서버-관리)
9. [Stripe 결제 운영](#9-stripe-결제-운영)
10. [LLM 비용 관리](#10-llm-비용-관리)
11. [장애 대응](#11-장애-대응)
12. [코딩 컨벤션](#12-코딩-컨벤션)
13. [체크리스트](#13-체크리스트)

---

## 1. 환경 설정

### 1.1 필수 환경변수

`.env.local` 파일에 다음 환경변수를 설정한다:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# 암호화 (32바이트 hex)
ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 앱
NEXT_PUBLIC_APP_URL=https://vibeuniv.com
```

### 1.2 ENCRYPTION_KEY 생성 방법

```bash
# 32바이트(64 hex 문자) 랜덤 키 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**주의:** 이 키를 변경하면 기존에 암호화된 모든 LLM API 키와 파일 콘텐츠를 복호화할 수 없게 된다. 절대 분실하지 말 것.

### 1.3 Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 마이그레이션 파일 순서대로 실행:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_cascade_delete_conversations_sessions.sql`
3. Authentication → Providers에서 GitHub, Google OAuth 활성화
4. Settings → API에서 URL, anon key, service_role key 확인

### 1.4 Stripe 설정

1. Stripe Dashboard에서 Products 생성:
   - Pro Plan: $19/month (recurring)
   - Team Plan: $49/month (recurring)
2. Webhook 엔드포인트 등록: `https://vibeuniv.com/api/stripe/webhook`
3. Webhook 이벤트 구독:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

---

## 2. 로컬 개발

### 2.1 초기 설정

```bash
# 의존성 설치
npm install

# MCP 서버 빌드
cd packages/mcp-server && npm install && npm run build && cd ../..

# 개발 서버 시작 (Turbopack)
npm run dev
```

### 2.2 npm scripts

```bash
npm run dev        # Next.js 개발 서버 (Turbopack)
npm run dev:full   # 환경 체크 + 자동 설정 + 개발 서버 (권장)
npm run build      # 프로덕션 빌드
npm run start      # 프로덕션 모드 실행
npm run lint       # ESLint 검사
npm run format     # Prettier 포맷팅
npm run deploy     # 커밋 → push → PR → merge → Vercel 배포 원스톱
npm run mcp:build  # MCP 서버 빌드
npm run mcp:dev    # MCP 서버 개발 모드
```

### 2.3 개발 서버 스크립트 (`scripts/dev.sh`)

`npm run dev:full`로 실행한다. 수동 설정 없이 바로 개발을 시작할 수 있다.

**실행 흐름:**
1. `.env.local` 파일 존재 확인 (없으면 에러)
2. 필수 환경변수 비어있으면 경고 표시 (`SUPABASE_URL`, `ANON_KEY`, `ENCRYPTION_KEY`)
3. `node_modules/` 없으면 자동 `npm install`
4. `packages/mcp-server/dist/` 없으면 자동 MCP 서버 빌드
5. `next dev --turbopack` 실행

```bash
# 권장 사용법
npm run dev:full

# 또는 직접 실행
bash scripts/dev.sh
```

### 2.4 테스트 계정

- **Email:** test@vibestack.dev
- **Password:** testpass123

### 2.5 MCP 서버 로컬 테스트

```bash
# npm script 사용
npm run mcp:build   # 빌드
npm run mcp:dev     # 개발 모드 (tsx)

# 환경변수와 함께 직접 실행
cd packages/mcp-server
VIBEUNIV_API_KEY=vs_xxx VIBEUNIV_API_URL=http://localhost:3000 npm run dev

# 빌드 후 실행
npm run build
VIBEUNIV_API_KEY=vs_xxx VIBEUNIV_API_URL=http://localhost:3000 node dist/index.js
```

---

## 3. Git 워크플로우

### 3.1 브랜치 전략

```
main (프로덕션)
├── feature/xxx   (기능 개발)
├── fix/xxx       (버그 수정)
├── rebrand/xxx   (리브랜딩)
└── chore/xxx     (유지보수)
```

### 3.2 규칙

- **main 브랜치 직접 push 금지** — hook으로 차단됨
- 기능 브랜치 생성 → PR → merge 방식으로 진행
- PR에 변경 사항 요약과 테스트 계획 포함

### 3.3 커밋 메시지

```
<type>: <subject>

<body>
```

**type:**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링
- `chore`: 설정, 의존성 등 유지보수
- `docs`: 문서 변경
- `style`: 코드 스타일 변경
- `perf`: 성능 개선

---

## 4. 배포

### 4.1 배포 스크립트 (`scripts/deploy.sh`)

`npm run deploy`로 커밋부터 프로덕션 배포까지 한 번에 처리한다.

**실행 흐름:**
1. main 브랜치 직접 배포 차단
2. 변경사항이 있으면:
   - `npm run build`로 빌드 검증 (실패 시 중단)
   - `npm run lint`로 린트 검사
   - 커밋 메시지 입력 → 스테이징 + 커밋
3. `git push -u origin <branch>`
4. 기존 PR이 있으면 자동 반영, 없으면 PR 생성 (제목 입력)
5. merge 여부 확인 → Y 시:
   - `gh pr merge` 실행
   - `vercel --prod`로 프로덕션 배포
6. 배포 완료 후 원래 브랜치로 복귀

```bash
# 사용법
npm run deploy

# 또는 직접 실행
bash scripts/deploy.sh
```

**전제 조건:**
- `gh` (GitHub CLI) 설치 및 로그인
- `vercel` CLI 접근 가능 (npx로 자동 실행)
- 기능 브랜치에서 실행 (main에서는 차단)

### 4.2 수동 배포

스크립트를 사용하지 않고 수동으로 배포하는 경우:

```bash
# 1. 커밋 + push
git add -A && git commit -m "feat: ..." && git push

# 2. PR 생성 (또는 기존 PR에 자동 반영)
gh pr create --base main --title "PR 제목"

# 3. merge
gh pr merge <PR번호> --merge

# 4. Vercel 배포
git checkout main && git pull
npx vercel --prod
```

### 4.3 Vercel 자동 배포

- **자동 배포:** Vercel에 GitHub 연동 시 main push로 자동 빌드/배포
- **프리뷰:** PR 생성 시 프리뷰 URL 자동 생성
- **도메인:** vibeuniv.com
- **현재:** `vercel --prod` 수동 트리거 방식 사용 중

### 4.4 환경변수 관리

Vercel Dashboard → Settings → Environment Variables에서 관리한다.

| 변수 | 환경 | 비고 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | 공개 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only | 비밀 |
| `ENCRYPTION_KEY` | Production only | 비밀, 절대 변경 금지 |
| `STRIPE_SECRET_KEY` | Production only | 비밀 |
| `STRIPE_WEBHOOK_SECRET` | Production only | 비밀 |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | 환경별 다름 |

### 4.5 배포 전 체크리스트

- [ ] `npm run build` 로컬에서 성공 확인
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 경고/에러 없음
- [ ] 환경변수 누락 없음
- [ ] DB 마이그레이션 필요 시 먼저 실행 완료
- [ ] Stripe 웹훅 엔드포인트 정상 동작 확인

### 4.6 롤백

Vercel Dashboard → Deployments에서 이전 배포로 즉시 롤백 가능.

---

## 5. 데이터베이스 관리

### 5.1 마이그레이션

마이그레이션 파일은 `supabase/migrations/` 디렉토리에 순번으로 관리한다.

```
supabase/migrations/
├── 001_initial_schema.sql
├── 002_cascade_delete_conversations_sessions.sql
└── 003_next_migration.sql  (새로 추가 시)
```

**실행 방법:**
1. Supabase Dashboard → SQL Editor에서 수동 실행
2. 또는 Supabase CLI 사용:
   ```bash
   supabase db push
   ```

**규칙:**
- 파일 번호는 순차적으로 부여 (`001`, `002`, `003`, ...)
- 한 번 적용된 마이그레이션은 수정하지 않고, 새 마이그레이션으로 변경
- 프로덕션 적용 전 로컬/스테이징에서 테스트

### 5.2 RLS 정책 확인

```sql
-- 모든 테이블의 RLS 활성화 상태 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- RLS 정책 목록
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 5.3 백업

- Supabase는 자동 일일 백업을 제공한다 (Pro 플랜 이상)
- 중요 마이그레이션 전 수동 백업을 권장한다

### 5.4 데이터 정리

주기적으로 불필요한 데이터를 정리한다:

```sql
-- 30일 이상 비활성 MCP 세션 정리
DELETE FROM mcp_sessions
WHERE is_active = false AND session_end < now() - interval '30 days';

-- 실패한 오래된 분석 작업 정리
DELETE FROM analysis_jobs
WHERE status = 'failed' AND created_at < now() - interval '90 days';
```

---

## 6. 보안 운영

### 6.1 키 관리

| 키 | 위치 | 보안 수준 |
|----|------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel 환경변수 | 최고 — DB 전체 접근 가능 |
| `ENCRYPTION_KEY` | Vercel 환경변수 | 최고 — 분실 시 데이터 복구 불가 |
| `STRIPE_SECRET_KEY` | Vercel 환경변수 | 높음 — 결제 처리 권한 |
| `STRIPE_WEBHOOK_SECRET` | Vercel 환경변수 | 높음 — Webhook 검증용 |
| 사용자 LLM 키 | DB (AES-256-GCM 암호화) | 높음 — ENCRYPTION_KEY로 복호화 |
| 사용자 API 키 | DB (bcrypt 해시) | 중간 — 단방향 해시로 원본 복구 불가 |

### 6.2 보안 헤더 확인

배포 후 보안 헤더가 정상 적용되는지 확인:

```bash
curl -I https://vibeuniv.com

# 확인할 헤더:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 6.3 Rate Limiting 확인

```bash
# API 엔드포인트 호출 시 rate limit 헤더 확인
curl -I -H "Authorization: Bearer vs_xxx" https://vibeuniv.com/api/v1/health

# 확인할 헤더:
# X-RateLimit-Limit: 60
# X-RateLimit-Remaining: 59
# X-RateLimit-Reset: <unix timestamp>
```

### 6.4 보안 점검 항목

정기적으로 확인할 사항:

- [ ] 환경변수가 코드에 하드코딩되어 있지 않은지 확인
- [ ] `.env*` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] RLS 정책이 모든 테이블에 활성화되어 있는지 확인
- [ ] 새로 추가된 테이블에 RLS가 적용되었는지 확인
- [ ] 민감 파일(.env, credentials)이 MCP 업로드에서 제외되는지 확인
- [ ] npm 패키지 보안 취약점 확인 (`npm audit`)
- [ ] Supabase Auth 설정 (OAuth redirect URL, 이메일 확인 등) 검토

---

## 7. 모니터링 및 로깅

### 7.1 Vercel 모니터링

- **Logs:** Vercel Dashboard → Functions → Logs에서 실시간 로그 확인
- **Analytics:** Vercel Analytics로 페이지 성능 모니터링
- **Edge Functions:** middleware.ts 실행 로그

### 7.2 주요 모니터링 지표

| 지표 | 확인 방법 | 기준 |
|------|----------|------|
| API 응답 시간 | Vercel Logs | < 3초 |
| Rate Limit 429 비율 | Vercel Logs | 비정상적 급증 확인 |
| 분석 작업 실패율 | `analysis_jobs` 테이블 | failed/total < 5% |
| LLM 토큰 사용량 | `analysis_jobs` 테이블 | 월별 트렌드 추적 |
| 활성 사용자 수 | `users` 테이블 | 성장 지표 |
| MCP 세션 수 | `mcp_sessions` 테이블 | 클라이언트별 분포 |

### 7.3 에러 추적 쿼리

```sql
-- 최근 실패한 분석 작업
SELECT id, project_id, llm_provider, error_message, created_at
FROM analysis_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- 가장 많이 실패하는 LLM 프로바이더
SELECT llm_provider, COUNT(*) as failures
FROM analysis_jobs
WHERE status = 'failed'
GROUP BY llm_provider
ORDER BY failures DESC;

-- 월별 토큰 사용량
SELECT
  date_trunc('month', created_at) as month,
  SUM(input_tokens) as total_input,
  SUM(output_tokens) as total_output,
  SUM(cost_usd) as total_cost
FROM analysis_jobs
WHERE status = 'completed'
GROUP BY month
ORDER BY month DESC;
```

### 7.4 Stripe 이벤트 모니터링

Stripe Dashboard → Events에서 실패한 이벤트를 확인한다:
- `checkout.session.completed` 실패 → 사용자 플랜 미갱신
- `customer.subscription.deleted` 실패 → 만료된 구독자가 계속 Pro 사용

---

## 8. MCP 서버 관리

### 8.1 MCP 서버 구조 이해

MCP 서버는 **별도의 서버가 아니다.** 사용자의 IDE에서 stdio 프로세스로 실행되며, Next.js 앱의 `/api/v1/*` REST API를 호출하는 HTTP 클라이언트다.

```
사용자 PC                                    Vercel
┌────────────────────────┐                  ┌────────────────────┐
│  IDE (Claude Code 등)  │                  │  Next.js App       │
│        ▲               │                  │  (vibeuniv.com)    │
│   stdio│MCP Protocol   │                  │                    │
│        ▼               │   HTTPS fetch    │  /api/v1/projects  │
│  MCP Server ──────────────────────────────►  /api/v1/learning  │
│  (npm 패키지)          │   Bearer vs_xxx  │  /api/v1/...       │
└────────────────────────┘                  └────────────────────┘
```

- **포트를 열지 않는다** — stdio 전송만 사용
- **Next.js와 동일한 API** — 웹 대시보드와 MCP가 같은 엔드포인트를 공유
- **로컬 테스트 시** — `VIBEUNIV_API_URL=http://localhost:3000/api/v1`로 로컬 Next.js 개발 서버 사용

### 8.2 npm 패키지 배포

```bash
cd packages/mcp-server

# 버전 업데이트
npm version patch  # 0.1.0 → 0.1.1

# 빌드
npm run build

# 퍼블리시 (npm 로그인 필요)
npm publish
```

### 8.3 사용자 설정 가이드

사용자가 MCP 서버를 설정하는 방법:

**Claude Code:**
```bash
claude mcp add vibeuniv -- npx -y @vibestack/mcp-server
```

환경변수 설정 (Claude Desktop `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibestack/mcp-server"],
      "env": {
        "VIBEUNIV_API_KEY": "vs_xxxxx",
        "VIBEUNIV_API_URL": "https://vibeuniv.com/api/v1"
      }
    }
  }
}
```

`VIBEUNIV_API_URL`은 생략 가능 (기본값: `https://vibeuniv.com/api/v1`).

### 8.4 MCP 서버 버전 관리

- MCP 서버는 REST API의 하위 호환성에 의존한다
- API 변경 시 MCP 서버도 함께 업데이트해야 한다
- 주요 API 변경 시 MCP 서버 메이저 버전을 올린다
- `/api/v1/*` 엔드포인트 변경은 MCP 서버 배포와 동시에 진행할 것

---

## 9. Stripe 결제 운영

### 9.1 플랜 변경 처리 흐름

```
사용자 → Stripe Checkout → 결제 완료
  → Webhook: checkout.session.completed
  → users.plan_type 업데이트
  → users.stripe_customer_id 저장
  → users.plan_expires_at 설정
```

### 9.2 구독 취소 처리

```
사용자 → Stripe Portal → 구독 취소
  → Webhook: customer.subscription.deleted
  → users.plan_type = 'free'
  → users.plan_expires_at = null
```

### 9.3 결제 관련 주의사항

- Webhook 시크릿이 올바른지 정기적으로 확인
- 테스트 모드와 라이브 모드의 키를 혼동하지 않도록 주의
- Stripe Dashboard에서 실패한 결제/Webhook 이벤트를 주기적으로 확인
- 환불 처리는 Stripe Dashboard에서 수동으로 진행

### 9.4 테스트 결제

Stripe 테스트 모드에서 사용:
- 성공 카드: `4242 4242 4242 4242`
- 거부 카드: `4000 0000 0000 0002`
- 3DS 필요: `4000 0027 6000 3184`

---

## 10. LLM 비용 관리

### 10.1 비용 구조

LLM 비용은 두 가지 경로로 발생한다:

1. **BYOK (Pro/Team 사용자):** 사용자 자신의 API 키로 호출 → 비용 없음
2. **플랫폼 키 사용:** Free 사용자 또는 키 미등록 시 → 서비스 비용 발생

### 10.2 토큰 사용량 추적

모든 LLM 호출은 `analysis_jobs` 테이블에 기록된다:

```sql
-- 일별 비용 추적
SELECT
  date_trunc('day', created_at) as day,
  llm_provider,
  SUM(input_tokens) as input_tokens,
  SUM(output_tokens) as output_tokens,
  SUM(cost_usd) as cost
FROM analysis_jobs
WHERE status = 'completed'
  AND created_at > now() - interval '30 days'
GROUP BY day, llm_provider
ORDER BY day DESC;
```

### 10.3 비용 최적화

- **기본 프로바이더:** Anthropic Claude (가장 안정적인 분석 품질)
- **2-Phase 학습 생성:** 구조와 콘텐츠를 분리하여 불필요한 재생성 최소화
- **프로젝트 다이제스트:** 전체 파일 대신 구조화된 요약 사용으로 토큰 절감
- **Free 티어 제한:** 과도한 무료 사용 방지 (월 20 대화, 3 프로젝트)

---

## 11. 장애 대응

### 11.1 일반 장애 시나리오

#### 시나리오 1: LLM API 호출 실패

**증상:** 분석 작업이 `failed` 상태로 전환
**원인:** LLM API 일시 장애, 토큰 한도 초과, 잘못된 API 키
**대응:**
1. `analysis_jobs`에서 `error_message` 확인
2. LLM 프로바이더 상태 페이지 확인
3. 사용자에게 재시도 안내
4. 프로바이더 장기 장애 시 기본 프로바이더 변경 검토

#### 시나리오 2: Supabase 연결 실패

**증상:** 모든 페이지에서 500 에러
**원인:** Supabase 프로젝트 일시정지, 연결 풀 소진
**대응:**
1. Supabase Dashboard에서 프로젝트 상태 확인
2. 프로젝트가 일시정지된 경우 재시작
3. 연결 풀 문제 시 Supabase 지원팀 문의

#### 시나리오 3: Stripe Webhook 실패

**증상:** 결제 완료 후 플랜이 업그레이드되지 않음
**원인:** Webhook 시크릿 불일치, 서버 에러
**대응:**
1. Stripe Dashboard → Webhooks → Events에서 실패 이벤트 확인
2. 에러 메시지 분석
3. 수동으로 사용자 `plan_type` 업데이트 (긴급)
4. Webhook 재전송으로 검증

#### 시나리오 4: Rate Limiting 오작동

**증상:** 정상 사용자가 429 에러를 받음
**원인:** 인메모리 rate limiter 재시작 시 초기화, 과도한 제한
**대응:**
1. `middleware.ts`의 RATE_LIMITS 값 조정
2. Vercel 재배포 시 인메모리 카운터 자동 초기화됨
3. 프로덕션 스케일 필요 시 Vercel KV/Upstash로 교체 검토

### 11.2 긴급 연락

- **Vercel:** [status.vercel.com](https://status.vercel.com)
- **Supabase:** [status.supabase.com](https://status.supabase.com)
- **Stripe:** [status.stripe.com](https://status.stripe.com)

---

## 12. 코딩 컨벤션

### 12.1 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 | kebab-case | `tech-stack-analyzer.ts` |
| 컴포넌트 | PascalCase | `TechStackCard.tsx` |
| 함수/변수 | camelCase | `analyzeTechStack` |
| 상수 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| DB 테이블/컬럼 | snake_case | `tech_stacks`, `user_id` |
| API 엔드포인트 | kebab-case | `/api/v1/projects` |
| MCP 도구 | snake_case with prefix | `vibeuniv_sync_project` |

### 12.2 TypeScript 규칙

- strict mode 필수
- `any` 타입 사용 금지 — 반드시 타입 정의
- 비동기 함수는 항상 `async/await`
- 에러 처리는 `try/catch`
- 모든 API 응답은 타입 정의

### 12.3 컴포넌트 규칙

- Server Component가 기본
- 클라이언트 상태가 필요한 경우에만 `'use client'`
- Tailwind CSS만 사용 (CSS 파일 별도 생성 금지)
- 아이콘은 lucide-react

### 12.4 API 규칙

- 외부 API (`/api/v1/*`): API 키 인증 필수
- 내부 API: Supabase Auth 세션 기반
- 응답 형식: `{ success: boolean, data?: T, error?: string }`
- 에러 시 적절한 HTTP 상태코드

### 12.5 DB 규칙

- Supabase JS 클라이언트 사용 (직접 SQL 금지, 마이그레이션 제외)
- RLS 모든 테이블에 적용
- UUID를 PK로 사용
- `created_at`, `updated_at` 모든 테이블에 포함

### 12.6 LLM 규칙

- 직접 API 호출 금지 — `lib/llm/` Provider Adapter 경유
- 사용자 API 키는 AES-256-GCM으로 암호화하여 DB 저장
- 프롬프트는 `lib/prompts/`에 별도 파일로 관리
- 토큰 사용량 추적 필수 (`analysis_jobs`)

---

## 13. 체크리스트

### 13.1 새 기능 개발 체크리스트

- [ ] 기능 브랜치 생성 (`feature/xxx`)
- [ ] TypeScript strict 타입 에러 없음
- [ ] `any` 타입 미사용
- [ ] 새 DB 테이블에 RLS 적용
- [ ] 새 API에 인증 적용 (API 키 또는 세션)
- [ ] API 응답 형식 준수 (`{ success, data?, error? }`)
- [ ] 에러 처리 (`try/catch`)
- [ ] LLM 호출 시 토큰 추적
- [ ] Free 티어 사용량 제한 확인
- [ ] `npm run build` 성공
- [ ] `npm run lint` 통과
- [ ] PR 생성 및 리뷰

### 13.2 DB 마이그레이션 체크리스트

- [ ] 마이그레이션 SQL 작성
- [ ] 로컬에서 실행 테스트
- [ ] 기존 데이터 호환성 확인
- [ ] RLS 정책 포함 여부 확인
- [ ] 인덱스 필요성 검토
- [ ] CASCADE DELETE 설정 확인
- [ ] 프로덕션 적용 전 백업

### 13.3 배포 체크리스트

- [ ] 로컬 빌드 성공
- [ ] 환경변수 확인
- [ ] DB 마이그레이션 완료 (필요 시)
- [ ] Stripe 설정 확인 (필요 시)
- [ ] MCP 서버 호환성 확인 (API 변경 시)
- [ ] 배포 후 헬스체크 (`/api/v1/health`)
- [ ] 보안 헤더 확인
- [ ] Rate Limit 동작 확인

### 13.4 주간 운영 체크리스트

- [ ] 실패한 분석 작업 확인 및 원인 분석
- [ ] Stripe 실패 이벤트 확인
- [ ] LLM 토큰 사용량 및 비용 확인
- [ ] npm 보안 취약점 확인 (`npm audit`)
- [ ] Supabase 사용량 확인 (DB 크기, 요청 수)
- [ ] Vercel 사용량 확인 (Function 실행, 대역폭)

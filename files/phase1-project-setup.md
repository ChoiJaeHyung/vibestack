# Phase 1: 프로젝트 초기 설정

아래 스펙대로 프로젝트를 처음부터 설정해줘.

## 1. Next.js 프로젝트 생성
- Next.js 15, App Router, TypeScript strict mode
- Tailwind CSS v4
- `src/` 디렉토리 사용하지 않음 (루트에 `app/`, `components/` 등)

## 2. 폴더 구조 생성
```
app/
  (auth)/
    login/page.tsx
    signup/page.tsx
    callback/route.ts        # Supabase OAuth 콜백
  (dashboard)/
    layout.tsx               # 사이드바 + 메인 레이아웃
    page.tsx                 # 대시보드 홈
    projects/page.tsx        # 프로젝트 목록
    projects/[id]/page.tsx   # 프로젝트 상세
    settings/page.tsx        # 설정 (LLM 키 관리 등)
  api/
    v1/
      projects/
        route.ts             # POST: 프로젝트 생성/수집
      projects/[id]/
        route.ts             # GET: 프로젝트 상세
      projects/[id]/files/
        route.ts             # POST: 파일 업로드
      projects/[id]/analyze/
        route.ts             # POST: 분석 트리거
      health/
        route.ts             # GET: 헬스체크
  layout.tsx
  page.tsx                   # 랜딩 페이지
components/
  ui/
    button.tsx
    card.tsx
    input.tsx
    sidebar.tsx
    loading.tsx
  features/
    project-card.tsx
    tech-stack-badge.tsx
lib/
  supabase/
    server.ts                # 서버사이드 Supabase 클라이언트
    client.ts                # 클라이언트사이드 Supabase 클라이언트
    middleware.ts             # Auth 미들웨어
  utils/
    encryption.ts            # AES-256-GCM 암호화/복호화
    api-response.ts          # 통일된 API 응답 헬퍼
    constants.ts
server/
  middleware/
    api-auth.ts              # API 키 인증 미들웨어
types/
  database.ts                # Supabase 테이블 타입
  api.ts                     # API 요청/응답 타입
middleware.ts                 # Next.js 미들웨어 (Supabase Auth)
```

## 3. Supabase 설정
- `lib/supabase/server.ts`: `createServerClient` (쿠키 기반, 서버 컴포넌트/API Route용)
- `lib/supabase/client.ts`: `createBrowserClient` (클라이언트 컴포넌트용)
- `middleware.ts`: Supabase Auth 세션 갱신 미들웨어
- `app/(auth)/callback/route.ts`: OAuth 콜백 처리

## 4. 인증 시스템
- Supabase Auth 사용
- 이메일/비밀번호 + Google OAuth + GitHub OAuth
- 로그인/회원가입 페이지 구현
- 인증되지 않은 사용자는 `(dashboard)` 접근 불가 (미들웨어에서 리다이렉트)

## 5. 대시보드 레이아웃
- 왼쪽 사이드바: 로고, 네비게이션(대시보드, 프로젝트, 학습, 설정), 하단에 사용자 프로필
- 메인 영역: 각 페이지 콘텐츠
- 반응형: 모바일에서 사이드바는 햄버거 메뉴로 토글
- 디자인: 깔끔하고 모던한 다크/라이트 모드 지원

## 6. API 기본 구조
- `/api/v1/health`: `{ status: "ok", version: "1.0.0" }` 반환
- `/api/v1/projects`: 아직 빈 핸들러 (Phase 3에서 구현)
- API 키 인증 미들웨어 (`server/middleware/api-auth.ts`):
  - `Authorization: Bearer vs_xxxxx` 헤더 검증
  - user_api_keys 테이블에서 해시 비교
  - 아직 DB 없으므로 스켈레톤만 만들고 TODO 주석 남길 것

## 7. 유틸리티
- `lib/utils/encryption.ts`: AES-256-GCM 암호화/복호화 함수 (ENCRYPTION_KEY 환경변수 사용)
- `lib/utils/api-response.ts`: 통일된 응답 형식
  ```typescript
  export function successResponse<T>(data: T) { return NextResponse.json({ success: true, data }) }
  export function errorResponse(message: string, status: number) { ... }
  ```

## 8. 환경변수
`.env.local.example` 파일 생성:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ENCRYPTION_KEY=your_32_byte_hex_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 9. 기타 설정
- ESLint + Prettier 설정
- `.gitignore` 설정 (node_modules, .env.local, .next)
- `README.md` 기본 내용
- `package.json`에 필요한 의존성 모두 포함

## 완료 조건
- `npm run dev`로 에러 없이 실행
- `/` 랜딩 페이지 접근 가능
- `/login` 로그인 페이지 접근 가능
- `/api/v1/health` 가 정상 응답 반환
- TypeScript 에러 없음
- 빌드(`npm run build`) 성공


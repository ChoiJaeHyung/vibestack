# Phase 6: 대시보드 + 결제 + 출시 준비

메인 대시보드, Stripe 결제, 랜딩 페이지, MCP 서버 npm 배포를 구현해줘.

## 1. 메인 대시보드 (`app/(dashboard)/page.tsx`)

### 상단 요약 카드 (4개)
- **총 프로젝트:** 등록된 프로젝트 수
- **감지된 기술:** 전체 고유 기술 수
- **학습 진행률:** 완료 모듈 / 전체 모듈 (%)
- **AI 대화:** 이번 달 AI 튜터 대화 횟수

### 최근 프로젝트 섹션
- 최근 3개 프로젝트 카드
- 각 카드: 이름, 소스 플랫폼 아이콘, 상태 뱃지, 주요 기술 태그(3개)
- "모든 프로젝트 보기" 링크

### 기술 역량 차트
- Recharts 사용
- 카테고리별 기술 수 바 차트 (Framework, Language, Database 등)
- 또는 레이더 차트로 기술 분포 시각화

### 학습 활동 섹션
- 현재 진행 중인 학습 모듈 (있으면)
- "이어서 학습하기" 버튼
- 최근 7일 학습 시간 그래프 (간단한 라인/바 차트)

## 2. Stripe 결제 연동

### 설정
- Stripe SDK: `stripe`, `@stripe/stripe-js`
- 상품 3개 생성: Free (가격 없음), Pro ($19/mo), Team ($49/mo)
- Webhook으로 구독 상태 실시간 동기화

### 결제 페이지 (`app/(dashboard)/settings/billing/page.tsx`)
- 현재 플랜 표시
- 플랜 비교 테이블 (Free vs Pro vs Team)
- "업그레이드" 버튼 → Stripe Checkout으로 리다이렉트
- 구독 관리 → Stripe Customer Portal로 리다이렉트

### API 엔드포인트

#### POST /api/stripe/checkout
```typescript
// Request: { plan: 'pro' | 'team' }
// 1. Stripe Customer 생성 (없으면)
// 2. Stripe Checkout Session 생성
// 3. Checkout URL 반환
```

#### POST /api/stripe/webhook
```typescript
// Stripe Webhook 이벤트 처리:
// - checkout.session.completed → users.plan_type 업데이트 + plan_expires_at 설정
// - customer.subscription.updated → 플랜 변경 반영
// - customer.subscription.deleted → plan_type을 'free'로
// - invoice.payment_failed → 이메일 알림 (향후)
```

#### POST /api/stripe/portal
```typescript
// Stripe Customer Portal 세션 생성 → URL 반환
```

### 과금 적용
- `lib/utils/usage-limits.ts`에서 `users.plan_type` 확인
- Free 사용자의 제한 초과 시 업그레이드 모달 표시
- Pro/Team은 무제한 (BYOK 시 LLM 비용은 사용자 부담)

## 3. 랜딩 페이지 (`app/page.tsx`)

### 구성
1. **히어로 섹션:** 헤드라인 + 서브텍스트 + CTA 버튼 ("무료로 시작하기")
   - 헤드라인: "AI로 만들었다면, 이제 이해할 차례"
   - 서브텍스트: "바이브 코딩으로 만든 프로젝트의 기술 스택을 AI가 분석하고, 맞춤 학습 로드맵을 만들어 드립니다"

2. **작동 방식 (3단계):**
   - Step 1: MCP 연결 → 코딩 도구에서 자동 동기화
   - Step 2: AI 분석 → 기술 스택 자동 감지
   - Step 3: 맞춤 학습 → 내 프로젝트 기반 학습

3. **기능 하이라이트 (4개):**
   - MCP 원클릭 연동
   - 11개 LLM 지원 (BYOK)
   - 프로젝트 기반 맞춤 학습
   - AI 튜터 (내 코드로 설명)

4. **플랜 가격표:**
   - Free / Pro / Team 비교 테이블
   - Pro에 "인기" 뱃지
   - 각 플랜별 CTA 버튼

5. **FAQ 섹션** (5-7개)

6. **푸터:** 링크, 소셜, 저작권

### 디자인 가이드
- 깔끔하고 모던한 디자인
- 다크/라이트 모드 지원
- 그라데이션 배경 히어로
- 애니메이션: 스크롤 시 fade-in (가볍게)
- 반응형 필수

## 4. MCP 서버 npm 배포 준비

`packages/mcp-server/` 최종 점검:
- `package.json` 의 name, version, description, keywords, license, repository 확인
- `README.md` 최종 정리 (설치 방법, 설정 방법, 사용 예시)
- `npm run build` 성공
- `.npmignore` 설정 (src/, tsconfig.json, node_modules 제외)
- bin 엔트리포인트에 `#!/usr/bin/env node` shebang

## 5. SEO 설정

`app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: 'VibeStack - AI로 만든 프로젝트, 이제 이해하기',
  description: '바이브 코딩으로 만든 프로젝트의 기술 스택을 AI가 분석하고 맞춤 학습 로드맵을 제공합니다',
  openGraph: { ... },
  twitter: { ... },
};
```

- `app/robots.ts`: 크롤러 허용 설정
- `app/sitemap.ts`: 사이트맵 자동 생성
- 각 페이지별 적절한 title, description

## 6. 최종 점검 사항

- [ ] `npm run build` 에러 없음
- [ ] 모든 페이지 접근 가능
- [ ] 인증 플로우 동작 (회원가입 → 로그인 → 대시보드)
- [ ] 프로젝트 생성 → 파일 업로드 → AI 분석 → 결과 확인 플로우
- [ ] 학습 로드맵 생성 → 모듈 학습 → 진행률 추적 플로우
- [ ] AI 튜터 채팅 동작
- [ ] Stripe 결제 플로우 (테스트 모드)
- [ ] Free 티어 사용량 제한 동작
- [ ] MCP 서버 빌드 성공
- [ ] 반응형 (모바일/태블릿/데스크탑)
- [ ] 다크/라이트 모드
- [ ] API 키 인증 동작
- [ ] RLS 정책 동작 (다른 사용자 데이터 접근 불가)
- [ ] 환경변수 문서화

## 완료 조건
- 대시보드에 실제 데이터가 표시됨
- Stripe 테스트 결제 → 플랜 변경 → DB 반영
- 랜딩 페이지가 모든 디바이스에서 정상 표시
- Lighthouse SEO 점수 90+
- `packages/mcp-server`가 `npm pack`으로 정상 패키징
- Vercel에 배포 가능한 상태

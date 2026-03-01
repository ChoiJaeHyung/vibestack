# Codecademy 기능 분석 — VibeUniv 도입 검토

> 분석일: 2026-03-01
> 목적: Codecademy의 핵심 기능을 분석하고, VibeUniv에 도입 가능한 항목을 우선순위화

---

## 1. Codecademy 핵심 기능 요약

### 1.1 게이미피케이션

| 기능 | 설명 |
|------|------|
| **XP 포인트** | 레슨/연습/프로젝트 완료 시 XP 획득. 누적 XP로 레벨 산정 |
| **배지** | 4종류: 연습 배지(N개 완료), 코스 배지(레슨 완료), 코스 고유 배지, 프로모션 배지 |
| **주간 스트릭** | 주간 목표(기본 3일/주) 달성 시 스트릭 +1. 매주 월요일 리셋. 손실 회피 심리 활용 |
| **주간 학습 목표** | 첫 가입 시 "주 몇 일, 하루 몇 시간" 설정. 목표 대비 진행률 시각화 |
| **레벨 시스템** | 누적 XP 기반 레벨. 높은 레벨 = 전문성 시그널 |

### 1.2 진행률 표시

| 기능 | 설명 |
|------|------|
| **코스 진행률 바** | 레슨/코스 단위 % 진행 바. 즉각적 진행감 제공 |
| **일별 활동 캘린더** | 주간 캘린더(월~일)에 학습한 날 표시. 스트릭과 연동 |
| **마일스톤** | 코스 중간중간 마일스톤 표시. 큰 목표를 작은 단위로 분할 |

### 1.3 완료 피드백

| 기능 | 설명 |
|------|------|
| **축하 애니메이션** | 레슨 완료 시 confetti + 축하 메시지 |
| **배지 획득 알림** | 새 배지 획득 시 모달 팝업 |
| **레벨업 시각 효과** | XP 누적으로 레벨업 시 애니메이션 |

### 1.4 개인화

| 기능 | 설명 |
|------|------|
| **학습 스케줄 설정** | 주간 학습 일수 + 일일 학습 시간 선택 |
| **추천 시스템** | 완료한 코스 기반 다음 코스 추천 |
| **이어서 학습하기** | 대시보드에서 마지막 위치부터 바로 이어서 시작 |

### 1.5 소셜/공유

| 기능 | 설명 |
|------|------|
| **프로필 페이지** | 배지, 완료 코스, 스트릭, 포인트 표시 |
| **공유 카드** | 완료 인증서/배지를 SNS에 공유 가능 |

### 1.6 리텐션

| 기능 | 설명 |
|------|------|
| **이메일 리마인더** | 학습 목표 미달성 시 이메일 알림 |
| **푸시 알림** | 스트릭 끊기기 전 알림 |
| **3단계 강화 루프** | 미시(레슨 완료) → 중간(모듈/스트릭) → 거시(코스/배지) |

---

## 2. VibeUniv 현재 상태

### 2.1 이미 있는 것

| 기능 | 현재 구현 |
|------|-----------|
| 학습 경로 + 모듈 | 프로젝트 기반 AI 생성 커리큘럼 |
| 진행률 표시 | SVG 진행 링 (경로 단위 %, 모듈 완료 상태) |
| 퀴즈 | 객관식 4지선다 + 해설 + 점수 DB 저장 |
| 코드 챌린지 | react-simple-code-editor + 정답 토글 |
| AI 튜터 | 슬라이드 패널 (채팅 + 검색 탭) |
| 대시보드 통계 | 프로젝트 수, 기술 수, 학습 진행률, AI 대화 수 |
| 이어서 학습하기 | 대시보드에 현재 학습 경로 + 모듈 표시 |
| 난이도 뱃지 | Beginner / Intermediate / Advanced |
| 타임라인 모듈 목록 | 완료(초록) / 진행중(보라 펄스) / 미시작(회색) |
| 텍스트 선택 → AI 질문 | 학습 중 텍스트 드래그 → 튜터에게 질문 |

### 2.2 없는 것

| 기능 | 현재 상태 |
|------|-----------|
| 완료 축하 애니메이션 | 없음. 버튼 클릭 → 상태만 변경 |
| 스트릭 | 없음 |
| 주간 학습 목표 | 없음 |
| 배지/업적 | 없음 |
| XP/포인트/레벨 | 없음 |
| 학습 일정 리마인더 | 없음 |
| 학습 경로 공유 | 없음 |
| 프로필 페이지 | 없음 (이메일만 사이드바에 표시) |
| 일별 활동 캘린더 | 없음 |

---

## 3. 도입 후보 기능 상세

### 3.1 모듈 완료 축하 애니메이션

**Codecademy 방식:** confetti 파티클 + "Congratulations!" 메시지 + 획득 XP 표시

**VibeUniv 적용안:**
- 모듈 완료 시 confetti 애니메이션 (canvas-confetti 라이브러리, ~3KB)
- "축하해요! {모듈명} 완료" 모달
- 퀴즈 점수 표시 (있는 경우)
- "다음 모듈로" CTA 버튼

**변경 범위:**
- `components/features/module-content.tsx` — 완료 핸들러에 축하 UI 추가
- 새 컴포넌트 `components/features/celebration-modal.tsx`
- npm: `canvas-confetti`

**난이도:** 낮음 (프론트엔드만, DB 변경 없음)
**예상 임팩트:** 중 (즉각적 성취감 → 다음 모듈 전환율 상승)

---

### 3.2 학습 스트릭

**Codecademy 방식:** 주간 목표(기본 3일) 달성 → 스트릭 +1주. 매주 월요일 리셋. 대시보드 + 학습 페이지에 불꽃 아이콘으로 표시.

**VibeUniv 적용안:**
- 불꽃 아이콘 + "N주 연속 학습 중" 대시보드 배너
- 주간 캘린더 (월~일) — 학습한 날 체크 표시
- 스트릭 끊기기 직전 경고 UI ("오늘 학습하면 스트릭 유지!")

**변경 범위:**
- DB: `user_streaks` 테이블 신규
  ```sql
  id UUID PK
  user_id UUID FK UNIQUE
  current_streak INT DEFAULT 0       -- 현재 연속 주
  longest_streak INT DEFAULT 0       -- 최장 기록
  weekly_target INT DEFAULT 3        -- 주간 목표 일수
  last_active_date DATE              -- 마지막 학습일
  week_active_days INT DEFAULT 0     -- 이번 주 학습 일수
  week_start_date DATE               -- 이번 주 시작일 (월요일)
  created_at, updated_at
  ```
- `server/actions/learning.ts` — 모듈 완료 시 스트릭 업데이트 로직
- `components/features/dashboard-content.tsx` — 스트릭 위젯
- `components/features/streak-widget.tsx` — 신규 컴포넌트

**난이도:** 중
**예상 임팩트:** 높음 (리텐션 핵심 드라이버. Codecademy의 성장 핵심 기능)

---

### 3.3 주간 학습 목표 설정

**Codecademy 방식:** 온보딩 시 "주 몇 일 학습할래요?" 선택. 3일이 기본값 (심리학적 "골디락스 존").

**VibeUniv 적용안:**
- 설정 페이지 또는 첫 학습 시작 시 목표 설정 모달
- 선택지: 주 2일 / 3일(추천) / 5일 / 매일
- 대시보드에 "이번 주 목표: 2/3일 완료" 진행 바

**변경 범위:**
- DB: `user_streaks` 테이블의 `weekly_target` 활용 (3.2와 통합)
- `app/(dashboard)/settings/page.tsx` — 학습 목표 섹션 추가
- `components/features/dashboard-content.tsx` — 주간 목표 진행 위젯

**난이도:** 중 (3.2 스트릭과 함께 구현 시 효율적)
**예상 임팩트:** 높음 (습관 형성 + 스트릭 시너지)

---

### 3.4 배지/업적 시스템

**Codecademy 방식:** 연습 N개 완료 배지, 코스 완료 배지, 특수 배지(이벤트), 프로모션 배지.

**VibeUniv 적용안:**

| 배지 | 조건 | 아이콘 |
|------|------|--------|
| 첫 발자국 | 첫 모듈 완료 | 👶 |
| 꾸준한 학습자 | 4주 연속 스트릭 | 🔥 |
| 퀴즈 마스터 | 퀴즈 3회 연속 만점 | 🧠 |
| 코드 챌린저 | 챌린지 10개 해결 | 💻 |
| 풀스택 탐험가 | 커리큘럼 1개 전체 완료 | 🎓 |
| 다재다능 | 3개 이상 기술 스택 학습 | 🌈 |
| AI 친구 | AI 튜터 대화 50회 | 🤖 |
| 속도광 | 모듈 1개를 10분 내 완료 | ⚡ |

**변경 범위:**
- DB: `badges` (정의), `user_badges` (획득 기록) 테이블 신규
  ```sql
  -- badges
  id UUID PK
  slug VARCHAR UNIQUE            -- 'first_step', 'quiz_master' 등
  name VARCHAR                   -- '첫 발자국'
  description TEXT
  icon VARCHAR                   -- 이모지 또는 아이콘명
  condition_type VARCHAR          -- 'module_complete', 'streak', 'quiz_score' 등
  condition_value INT             -- 조건 수치
  created_at

  -- user_badges
  id UUID PK
  user_id UUID FK
  badge_id UUID FK
  earned_at TIMESTAMP
  UNIQUE(user_id, badge_id)
  ```
- `server/actions/badges.ts` — 배지 조건 체커 (모듈 완료/스트릭 갱신 시 호출)
- `components/features/badge-earned-modal.tsx` — 획득 시 축하 모달
- 대시보드 + 프로필에 배지 그리드 표시

**난이도:** 중
**예상 임팩트:** 중~높음 (장기 목표 부여, 수집 욕구 자극)

---

### 3.5 XP 포인트 + 레벨 시스템

**Codecademy 방식:** 모든 학습 행동에 XP 부여. 누적 XP로 레벨 결정.

**VibeUniv 적용안:**

| 행동 | XP |
|------|-----|
| 모듈 완료 | +100 |
| 퀴즈 만점 | +50 |
| 챌린지 해결 | +30 |
| 일일 학습 (첫 활동) | +20 |
| 스트릭 유지 (주간) | +50 |
| 커리큘럼 전체 완료 | +500 |

레벨: 0~100XP = Lv.1, 100~300 = Lv.2, 300~600 = Lv.3, ...

**변경 범위:**
- DB: `users` 테이블에 `total_xp INT DEFAULT 0`, `level INT DEFAULT 1` 추가
- `server/actions/xp.ts` — XP 부여 + 레벨 계산 로직
- 대시보드에 레벨 뱃지 + XP 진행 바
- 획득 시 토스트 알림 ("🎉 +100 XP!")

**난이도:** 중
**예상 임팩트:** 중 (매 행동마다 보상감. 배지와 결합 시 효과 극대화)

---

### 3.6 학습 경로 공유 카드

**Codecademy 방식:** 완료 인증서를 이미지로 생성하여 SNS 공유 가능.

**VibeUniv 적용안:**
- 커리큘럼 완료 시 동적 OG 이미지 생성 (기존 `opengraph-image.tsx` 패턴 활용)
- 공유 카드 내용: 프로젝트명, 학습 기술, 진행률, 배지, 소요 시간
- 공유 버튼: 트위터, 링크 복사

**변경 범위:**
- `app/api/share/learning-card/route.tsx` — 동적 이미지 생성 API
- 학습 경로 페이지에 공유 버튼 추가

**난이도:** 낮음 (기존 OG 이미지 생성 패턴 재활용)
**예상 임팩트:** 중 (바이럴 + 신규 유저 유입)

---

### 3.7 학습 일정 리마인더

**Codecademy 방식:** 목표 미달성 시 이메일 + 푸시 알림으로 복귀 유도.

**VibeUniv 적용안:**
- 주간 목표 미달성 시 이메일 알림 ("이번 주 목표까지 1일 남았어요!")
- 스트릭 끊기기 전 알림 ("스트릭이 끊어지기 전에 오늘 학습하세요!")

**변경 범위:**
- Supabase Edge Function + cron (주 2회)
- 이메일 템플릿 (Resend 또는 Supabase 내장)
- 알림 설정 토글 (설정 페이지)

**난이도:** 중~높음 (서버리스 함수 + 이메일 인프라 필요)
**예상 임팩트:** 높음 (이탈 사용자 복귀에 가장 효과적)

---

## 4. 구현 우선순위 로드맵

### Phase A: Quick Wins (1~2일)

| # | 기능 | 난이도 | DB 변경 |
|---|------|--------|---------|
| A1 | 모듈 완료 축하 애니메이션 | 낮음 | 없음 |
| A2 | 학습 경로 공유 카드 | 낮음 | 없음 |

### Phase B: 핵심 게이미피케이션 (3~5일)

| # | 기능 | 난이도 | DB 변경 |
|---|------|--------|---------|
| B1 | 학습 스트릭 + 주간 목표 | 중 | `user_streaks` 테이블 |
| B2 | 일별 활동 캘린더 위젯 | 중 | B1과 동일 데이터 활용 |

### Phase C: 업적 시스템 (3~5일)

| # | 기능 | 난이도 | DB 변경 |
|---|------|--------|---------|
| C1 | 배지/업적 시스템 | 중 | `badges`, `user_badges` 테이블 |
| C2 | XP 포인트 + 레벨 | 중 | `users`에 컬럼 추가 |

### Phase D: 리텐션 (5~7일)

| # | 기능 | 난이도 | DB 변경 |
|---|------|--------|---------|
| D1 | 학습 일정 리마인더 | 중~높음 | Edge Function + 이메일 |

---

## 5. 도입하지 않는 기능 (사유)

| 기능 | 사유 |
|------|------|
| 커리어 패스 | VibeUniv는 "내 프로젝트 기반" 학습이라 범용 커리어 경로와 성격이 다름 |
| 리더보드 | 개인 학습 플랫폼. 경쟁보다 자기 성장에 집중 |
| 인터랙티브 코드 실행 | 서버 비용 큼. 현재 코드 챌린지(에디터+정답 토글)로 충분 |
| 포럼/커뮤니티 | 초기 단계에서 커뮤니티 운영 부담 큼. AI 튜터가 대안 |
| 인증서 발급 | 프로젝트별 커리큘럼이라 범용 인증서 의미 약함 |

---

## 6. 참고 자료

- [Codecademy Gamification Case Study (Trophy)](https://www.trophy.so/blog/codecademy-gamification-case-study)
- [Deconstructing the Reward System: Codecademy (BadgeOS)](https://badgeos.org/deconstructing-the-reward-system-a-look-into-codecademy/)
- [About Badges and Weekly Targets (Codecademy Help)](https://help.codecademy.com/hc/en-us/articles/115003050088-About-Badges-and-Weekly-Targets)
- [How Codecademy uses gamification to teach 50M users](https://healthmattersandme.substack.com/p/how-codecademy-uses-gamification)

# VibeStack — Claude Code 개발 가이드

## 📁 파일 구성

```
CLAUDE.md                              ← 프로젝트 루트에 배치 (Claude Code가 자동으로 읽음)
prompts/
├── phase1-project-setup.md            ← Day 1-2: 프로젝트 초기 설정
├── phase2-mcp-server.md               ← Day 3-5: MCP 서버 개발
├── phase3-db-and-collection.md        ← Day 6-8: DB 스키마 + 프로젝트 수집
├── phase4-multi-llm-analysis.md       ← Day 9-13: 멀티 LLM + AI 분석
├── phase5-learning-system.md          ← Day 14-20: 학습 시스템
└── phase6-dashboard-payments-launch.md ← Day 21-30: 대시보드 + 결제 + 출시
```

---

## 🚀 사용 방법

### Step 0: 사전 준비
1. Node.js 20+ 설치
2. Supabase 프로젝트 생성 (https://supabase.com)
3. Anthropic API 키 발급 (https://console.anthropic.com)
4. Claude Code 설치 (`npm install -g @anthropic-ai/claude-code`)

### Step 1: CLAUDE.md 배치
```bash
mkdir vibestack && cd vibestack
# CLAUDE.md 파일을 이 디렉토리에 복사
```

CLAUDE.md는 Claude Code가 **자동으로** 읽는 프로젝트 컨텍스트 파일입니다.
여기에 기술 스택, 코딩 컨벤션, 폴더 구조 등 프로젝트 전반의 규칙이 담겨 있습니다.
Claude Code는 매 세션마다 이 파일을 참고하여 일관된 코드를 생성합니다.

### Step 2: Phase별 개발

**Claude Code를 실행하고, 각 Phase 프롬프트를 복사해서 붙여넣기 합니다.**

```bash
claude   # Claude Code 실행
```

그런 다음 채팅창에:

> phase1-project-setup.md의 전체 내용을 복사 → 붙여넣기

Claude Code가 작업을 완료하면, 다음 Phase로 넘어갑니다.

---

## ⚠️ 중요한 규칙

### 1. 한 번에 한 Phase만
- Phase 1이 완료되고 검증될 때까지 Phase 2로 넘어가지 마세요
- 각 Phase 끝의 "완료 조건"을 모두 확인하세요

### 2. 문제 발생 시
- 에러가 나면 에러 메시지를 그대로 Claude Code에 붙여넣기
- "이 에러를 해결해줘"라고 하면 대부분 해결됩니다
- 복잡한 문제는 작은 단위로 쪼개서 요청하세요

### 3. Phase 사이에 수동 작업
- **Phase 1 → Phase 2:** 없음 (바로 진행)
- **Phase 2 → Phase 3:** Supabase 대시보드에서 프로젝트 URL, anon key, service role key를 .env.local에 설정
- **Phase 3 → Phase 4:** Supabase SQL Editor에서 마이그레이션 파일 실행 (또는 Supabase CLI 사용)
- **Phase 4 → Phase 5:** Anthropic API 키를 설정 페이지에서 등록하고 테스트
- **Phase 5 → Phase 6:** Stripe 테스트 API 키를 .env.local에 설정

### 4. 프롬프트 커스텀
각 Phase 프롬프트는 그대로 써도 좋지만, 필요하면 수정해도 됩니다:
- 디자인을 바꾸고 싶으면 → 색상, 레이아웃 관련 부분 수정
- 기능을 추가하고 싶으면 → 프롬프트 끝에 추가 요구사항 작성
- 기능을 빼고 싶으면 → 해당 부분 삭제

### 5. CLAUDE.md 업데이트
프로젝트가 진행되면서 새로운 규칙이나 변경사항이 생기면
CLAUDE.md를 업데이트하세요. Claude Code가 항상 최신 컨텍스트를 참조합니다.

---

## 📋 Phase별 예상 진행

| Phase | 내용 | 예상 기간 | 핵심 결과물 |
|-------|------|----------|------------|
| 1 | 프로젝트 초기 설정 | 1-2일 | Next.js + Supabase + Auth 동작 |
| 2 | MCP 서버 개발 | 2-3일 | npm 패키지 빌드 성공 |
| 3 | DB + 프로젝트 수집 | 2-3일 | API로 프로젝트/파일 업로드 가능 |
| 4 | 멀티 LLM + 분석 | 4-5일 | AI가 기술 스택 분석 결과 반환 |
| 5 | 학습 시스템 | 5-7일 | 로드맵 생성 + AI 튜터 대화 가능 |
| 6 | 대시보드 + 결제 | 7-10일 | 배포 가능한 완성품 |

**총 예상: 약 25-30일 (1인 개발 기준)**

---

## 🔗 필요한 서비스 계정

| 서비스 | 용도 | 무료 티어 | URL |
|--------|------|----------|-----|
| Supabase | DB + Auth + Storage | 500MB DB, 1GB Storage | https://supabase.com |
| Vercel | 배포 | 무료 | https://vercel.com |
| Anthropic | AI (기본 LLM) | 무료 크레딧 | https://console.anthropic.com |
| Stripe | 결제 | 테스트 모드 무료 | https://stripe.com |
| npm | MCP 서버 배포 | 무료 | https://npmjs.com |

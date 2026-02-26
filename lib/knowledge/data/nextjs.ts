import type { TechKnowledge } from "../types";

export const NEXTJS_KNOWLEDGE: TechKnowledge = {
  technology_name: "Next.js",
  version: "15",
  concepts: [
    {
      concept_key: "app-router",
      concept_name: "App Router 이해하기",
      key_points: [
        "app/ 디렉토리의 파일 시스템 기반 라우팅",
        "page.tsx가 라우트 엔드포인트, layout.tsx가 공유 레이아웃",
        "loading.tsx, error.tsx, not-found.tsx 같은 특수 파일 컨벤션",
        "폴더명이 URL 경로가 됨 (app/dashboard/page.tsx → /dashboard)",
      ],
      common_quiz_topics: [
        "파일 컨벤션 (page.tsx vs layout.tsx 역할)",
        "동적 라우팅 [id] 문법",
        "Route Groups (괄호 폴더)의 용도",
      ],
      prerequisite_concepts: ["react-components"],
      tags: ["routing", "file-convention", "page", "layout"],
    },
    {
      concept_key: "server-components",
      concept_name: "서버 컴포넌트 vs 클라이언트 컴포넌트",
      key_points: [
        "Next.js 15에서 모든 컴포넌트는 기본 서버 컴포넌트",
        "'use client' 지시어로 클라이언트 컴포넌트 선언",
        "서버 컴포넌트: DB 접근, API 키 안전, 번들 크기 0",
        "클라이언트 컴포넌트: useState, useEffect, 이벤트 핸들러 필요 시",
        "서버 → 클라이언트 데이터 전달은 props로 (직렬화 가능한 값만)",
      ],
      common_quiz_topics: [
        "'use client'가 필요한 경우 vs 불필요한 경우",
        "서버 컴포넌트에서 불가능한 것들",
        "클라이언트/서버 경계에서 props 전달 규칙",
      ],
      prerequisite_concepts: ["react-components", "app-router"],
      tags: ["server-component", "client-component", "use-client", "RSC"],
    },
    {
      concept_key: "server-actions",
      concept_name: "Server Actions으로 폼 처리하기",
      key_points: [
        "'use server' 지시어로 서버 액션 정의",
        "클라이언트에서 직접 서버 함수를 호출하는 RPC 패턴",
        "form action 속성에 바로 연결 가능",
        "데이터 변경(mutation) 후 revalidatePath/revalidateTag로 캐시 갱신",
      ],
      common_quiz_topics: [
        "'use server' vs 'use client' 차이",
        "Server Action에서 인증 처리 방법",
        "Server Action vs API Route 선택 기준",
      ],
      prerequisite_concepts: ["server-components"],
      tags: ["server-action", "use-server", "form", "mutation"],
    },
    {
      concept_key: "api-routes",
      concept_name: "API Route 만들기",
      key_points: [
        "app/api/ 디렉토리의 route.ts 파일로 API 엔드포인트 생성",
        "GET, POST, PUT, DELETE 등 HTTP 메서드별 함수 export",
        "NextRequest, NextResponse 객체 사용",
        "외부 서비스(webhook, MCP 등)와의 통합 지점",
      ],
      common_quiz_topics: [
        "route.ts에서 지원하는 HTTP 메서드",
        "동적 API 라우트 [id]/route.ts 패턴",
        "미들웨어와 API Route의 관계",
      ],
      prerequisite_concepts: ["app-router"],
      tags: ["api", "route", "endpoint", "REST"],
    },
    {
      concept_key: "middleware",
      concept_name: "미들웨어로 요청 제어하기",
      key_points: [
        "프로젝트 루트의 middleware.ts에서 모든 요청 인터셉트",
        "인증 체크, 리다이렉트, 헤더 조작 등에 활용",
        "matcher 설정으로 적용 경로 제한",
        "Edge Runtime에서 실행 (Node.js API 일부 제한)",
      ],
      common_quiz_topics: [
        "미들웨어가 실행되는 시점",
        "미들웨어에서 할 수 있는 것과 없는 것",
        "matcher 패턴 작성법",
      ],
      prerequisite_concepts: ["app-router", "api-routes"],
      tags: ["middleware", "auth", "redirect", "edge"],
    },
  ],
};

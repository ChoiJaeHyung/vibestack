import type { TechKnowledge } from "../types";

export const TAILWIND_KNOWLEDGE: TechKnowledge = {
  technology_name: "Tailwind CSS",
  version: "4",
  concepts: [
    {
      concept_key: "utility-first",
      concept_name: "유틸리티 퍼스트 CSS 이해하기",
      key_points: [
        "미리 정의된 유틸리티 클래스를 조합하여 스타일링",
        "별도 CSS 파일 없이 HTML/JSX에서 직접 스타일 적용",
        "클래스명이 곧 스타일: flex, p-4, text-lg, bg-zinc-100",
        "디자인 시스템이 내장되어 일관된 간격/색상/크기 사용",
      ],
      common_quiz_topics: [
        "유틸리티 퍼스트의 장점과 단점",
        "클래스명으로 스타일 추론하기",
        "인라인 스타일과 유틸리티 클래스의 차이",
      ],
      prerequisite_concepts: [],
      tags: ["utility", "class", "styling", "design-system"],
    },
    {
      concept_key: "responsive-design",
      concept_name: "반응형 디자인 구현하기",
      key_points: [
        "sm:, md:, lg:, xl: 접두사로 브레이크포인트별 스타일",
        "모바일 퍼스트 접근: 기본이 모바일, sm부터 데스크톱",
        "flex, grid와 반응형 접두사 조합으로 레이아웃 변환",
        "hidden, block 등으로 요소 표시/숨김 제어",
      ],
      common_quiz_topics: [
        "모바일 퍼스트의 의미와 적용법",
        "브레이크포인트 크기와 적용 순서",
        "반응형 그리드 레이아웃 만들기",
      ],
      prerequisite_concepts: ["utility-first"],
      tags: ["responsive", "breakpoint", "mobile-first", "sm", "md", "lg"],
    },
    {
      concept_key: "flexbox-grid",
      concept_name: "Flexbox와 Grid 레이아웃",
      key_points: [
        "flex: 1차원 레이아웃 (행 또는 열)",
        "grid: 2차원 레이아웃 (행과 열 동시)",
        "items-center, justify-between 등 정렬 유틸리티",
        "gap-4로 아이템 간 간격 설정",
        "flex-col, grid-cols-3 등 방향과 컬럼 수 지정",
      ],
      common_quiz_topics: [
        "flex vs grid 사용 기준",
        "가운데 정렬하는 여러 방법",
        "gap과 padding/margin의 차이",
      ],
      prerequisite_concepts: ["utility-first"],
      tags: ["flex", "grid", "layout", "alignment", "gap"],
    },
    {
      concept_key: "dark-mode",
      concept_name: "다크 모드 구현하기",
      key_points: [
        "dark: 접두사로 다크 모드 스타일 지정",
        "bg-white dark:bg-zinc-900 패턴으로 색상 전환",
        "시스템 설정 기반 또는 수동 토글 방식",
        "Tailwind v4에서 CSS 변수 기반 테마 시스템",
      ],
      common_quiz_topics: [
        "dark: 접두사 동작 원리",
        "다크 모드 토글 구현 방법",
        "색상 팔레트 설계 패턴",
      ],
      prerequisite_concepts: ["utility-first"],
      tags: ["dark-mode", "theme", "color", "dark:"],
    },
    {
      concept_key: "tailwind-customization",
      concept_name: "커스터마이징과 확장",
      key_points: [
        "tailwind.config에서 테마 확장 (colors, spacing, fonts)",
        "커스텀 유틸리티 클래스 추가 (@layer utilities)",
        "플러그인으로 기능 확장 (typography, forms, animate)",
        "CSS 변수를 활용한 동적 테마 값",
      ],
      common_quiz_topics: [
        "테마 확장 vs 오버라이드 차이",
        "커스텀 색상 추가 방법",
        "@apply 디렉티브의 용도와 주의점",
      ],
      prerequisite_concepts: ["utility-first"],
      tags: ["config", "theme", "plugin", "custom", "extend"],
    },
  ],
};

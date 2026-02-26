import type { TechKnowledge } from "../types";

export const REACT_KNOWLEDGE: TechKnowledge = {
  technology_name: "React",
  version: "19",
  concepts: [
    {
      concept_key: "react-components",
      concept_name: "컴포넌트 기초 이해하기",
      key_points: [
        "컴포넌트는 UI를 독립적으로 재사용 가능한 단위로 나눈 것",
        "함수형 컴포넌트가 표준 (class 컴포넌트는 레거시)",
        "JSX로 HTML과 유사한 문법으로 UI 작성",
        "props로 부모 → 자식 데이터 전달",
        "컴포넌트 합성(composition)으로 복잡한 UI 구성",
      ],
      common_quiz_topics: [
        "JSX에서 JavaScript 표현식 사용법 (중괄호)",
        "props의 단방향 데이터 흐름",
        "컴포넌트 네이밍 규칙 (PascalCase)",
      ],
      prerequisite_concepts: [],
      tags: ["component", "jsx", "props", "composition"],
    },
    {
      concept_key: "hooks-state",
      concept_name: "useState로 상태 관리하기",
      key_points: [
        "useState는 컴포넌트에 변경 가능한 상태를 추가하는 Hook",
        "const [value, setValue] = useState(초기값) 패턴",
        "상태가 변경되면 컴포넌트가 자동으로 리렌더링",
        "상태 업데이트는 비동기 (배치 처리됨)",
        "객체/배열 상태는 불변성 유지 필요 (스프레드 연산자)",
      ],
      common_quiz_topics: [
        "상태 변경이 즉시 반영되지 않는 이유",
        "불변성을 유지해야 하는 이유",
        "함수형 업데이트 (prev => prev + 1) 패턴",
      ],
      prerequisite_concepts: ["react-components"],
      tags: ["useState", "state", "hook", "rerender"],
    },
    {
      concept_key: "hooks-effect",
      concept_name: "useEffect로 사이드 이펙트 처리하기",
      key_points: [
        "useEffect는 컴포넌트 외부와 상호작용하는 코드를 실행",
        "API 호출, 이벤트 리스너 등록, 타이머 설정 등에 사용",
        "의존성 배열로 실행 시점 제어 ([], [dep1, dep2])",
        "클린업 함수로 이펙트 정리 (return () => { ... })",
        "빈 의존성 배열 [] = 마운트 시 1회만 실행",
      ],
      common_quiz_topics: [
        "의존성 배열이 비어있을 때 vs 없을 때 차이",
        "클린업 함수가 필요한 경우",
        "무한 루프가 발생하는 실수 패턴",
      ],
      prerequisite_concepts: ["hooks-state"],
      tags: ["useEffect", "side-effect", "lifecycle", "cleanup"],
    },
    {
      concept_key: "conditional-rendering",
      concept_name: "조건부 렌더링 패턴",
      key_points: [
        "삼항 연산자로 조건부 UI 표시 (condition ? A : B)",
        "논리 AND 연산자로 조건부 표시 (condition && <Component />)",
        "early return으로 로딩/에러 상태 처리",
        "리스트 렌더링에서 key prop의 중요성",
      ],
      common_quiz_topics: [
        "key prop이 필요한 이유와 올바른 사용법",
        "falsy 값 (0, '') 렌더링 주의사항",
        "조건부 렌더링 vs CSS display:none 차이",
      ],
      prerequisite_concepts: ["react-components"],
      tags: ["conditional", "ternary", "key", "list"],
    },
    {
      concept_key: "event-handling",
      concept_name: "이벤트 처리와 폼 다루기",
      key_points: [
        "onClick, onChange, onSubmit 등 camelCase 이벤트 핸들러",
        "이벤트 핸들러에 함수 전달 (함수 호출이 아닌 함수 참조)",
        "e.preventDefault()로 기본 동작 방지 (폼 제출 등)",
        "제어 컴포넌트(controlled component)로 폼 입력 관리",
      ],
      common_quiz_topics: [
        "onClick={fn} vs onClick={fn()} 차이",
        "제어 컴포넌트 vs 비제어 컴포넌트",
        "이벤트 버블링과 stopPropagation",
      ],
      prerequisite_concepts: ["hooks-state"],
      tags: ["event", "form", "controlled", "handler"],
    },
    {
      concept_key: "react-context",
      concept_name: "Context로 전역 상태 공유하기",
      key_points: [
        "createContext + useContext로 prop drilling 없이 데이터 공유",
        "Provider 컴포넌트로 하위 트리에 값 제공",
        "테마, 인증 정보, 언어 설정 등에 주로 사용",
        "Context 값이 변경되면 모든 소비 컴포넌트가 리렌더링",
      ],
      common_quiz_topics: [
        "Context vs props 사용 기준",
        "Context 리렌더링 성능 이슈와 해결법",
        "여러 Context를 조합하는 패턴",
      ],
      prerequisite_concepts: ["hooks-state", "react-components"],
      tags: ["context", "provider", "global-state", "useContext"],
    },
  ],
};

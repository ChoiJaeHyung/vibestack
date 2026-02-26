import type { TechKnowledge } from "../types";

export const TYPESCRIPT_KNOWLEDGE: TechKnowledge = {
  technology_name: "TypeScript",
  version: "5",
  concepts: [
    {
      concept_key: "type-basics",
      concept_name: "타입 기초: 왜 타입이 필요한가",
      key_points: [
        "타입은 코드 실행 전에 버그를 잡아주는 안전장치",
        "string, number, boolean, null, undefined 기본 타입",
        "배열 타입 (string[], number[]) 과 객체 타입",
        "type과 interface로 커스텀 타입 정의",
        "타입 추론으로 명시적 타입 선언 줄이기",
      ],
      common_quiz_topics: [
        "type vs interface 차이점",
        "타입 추론이 작동하는 경우",
        "any를 피해야 하는 이유",
      ],
      prerequisite_concepts: [],
      tags: ["type", "interface", "inference", "basic"],
    },
    {
      concept_key: "generics",
      concept_name: "제네릭으로 유연한 타입 만들기",
      key_points: [
        "제네릭은 타입을 매개변수처럼 전달하는 패턴",
        "Array<T>, Promise<T>, Record<K, V> 등 내장 제네릭",
        "함수 제네릭: function identity<T>(arg: T): T",
        "제네릭 제약 (extends)으로 타입 범위 제한",
      ],
      common_quiz_topics: [
        "제네릭이 any보다 나은 이유",
        "제네릭 제약 (extends) 사용법",
        "실제 프로젝트에서 제네릭을 사용하는 경우",
      ],
      prerequisite_concepts: ["type-basics"],
      tags: ["generic", "type-parameter", "extends", "constraint"],
    },
    {
      concept_key: "union-narrowing",
      concept_name: "유니온 타입과 타입 내로잉",
      key_points: [
        "유니온 타입 (string | number)으로 여러 타입 허용",
        "타입 가드 (typeof, in, instanceof)로 타입 좁히기",
        "판별 유니온 (discriminated union)으로 안전한 분기",
        "Optional chaining (?.) 과 nullish coalescing (??)로 null 안전 처리",
      ],
      common_quiz_topics: [
        "typeof로 타입 가드하는 패턴",
        "판별 유니온의 type 필드 활용",
        "optional vs nullable 차이",
      ],
      prerequisite_concepts: ["type-basics"],
      tags: ["union", "narrowing", "type-guard", "optional"],
    },
    {
      concept_key: "utility-types",
      concept_name: "유틸리티 타입 활용하기",
      key_points: [
        "Partial<T>: 모든 프로퍼티를 선택적으로",
        "Pick<T, K>: 특정 프로퍼티만 선택",
        "Omit<T, K>: 특정 프로퍼티 제외",
        "Record<K, V>: 키-값 매핑 타입",
        "ReturnType<T>, Parameters<T>: 함수 타입에서 추출",
      ],
      common_quiz_topics: [
        "Partial vs Required 차이",
        "Pick vs Omit 사용 기준",
        "실제 API 응답 타입에 유틸리티 타입 적용",
      ],
      prerequisite_concepts: ["generics"],
      tags: ["utility", "Partial", "Pick", "Omit", "Record"],
    },
    {
      concept_key: "async-types",
      concept_name: "비동기 코드의 타입 처리",
      key_points: [
        "async 함수의 반환 타입은 자동으로 Promise<T>",
        "API 응답 타입 정의로 런타임 에러 사전 방지",
        "try/catch에서 error 타입 처리 (unknown → type guard)",
        "Awaited<T> 유틸리티로 Promise 내부 타입 추출",
      ],
      common_quiz_topics: [
        "Promise<T> 타입 작성법",
        "catch 블록에서 error 타입 다루기",
        "async/await vs .then() 타입 차이",
      ],
      prerequisite_concepts: ["type-basics", "generics"],
      tags: ["async", "Promise", "await", "error-handling"],
    },
  ],
};

export interface ConceptHint {
  concept_key: string;        // "app-router"
  concept_name: string;       // "App Router 이해하기"
  key_points: string[];       // 핵심 포인트 3-5개
  common_quiz_topics: string[]; // 좋은 퀴즈 주제
  prerequisite_concepts: string[]; // 선행 개념 키
  tags: string[];             // 매칭용 태그
}

export interface TechKnowledge {
  technology_name: string;    // "Next.js"
  version: string;            // "15"
  concepts: ConceptHint[];
}

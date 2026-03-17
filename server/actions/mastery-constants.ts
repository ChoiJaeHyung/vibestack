// Mastery & streak configuration — shared between server actions and client components.
// NOT a "use server" file so constants can be imported in client components too.

export const MASTERY = {
  /** 숙련도 최대값 */
  MAX_LEVEL: 100,
  /** 숙련도 최소값 */
  MIN_LEVEL: 0,
  /** "마스터" 판정 기준 */
  MASTERED_THRESHOLD: 80,

  // ── 5-Tier 숙련도 분류 ──
  /** Expert: 완전 스킵 */
  TIER_EXPERT: 90,
  /** Near-Mastery: 고급 활용/엣지케이스만 */
  TIER_NEAR_MASTERY: 70,
  /** Learning: 핵심 복습 + 실습 */
  TIER_LEARNING: 40,
  /** Beginner: 기초부터 단계적 */
  TIER_BEGINNER: 10,
  // 0-9: New — 비유부터 시작
  /** 퀴즈 만점 시 숙련도 증가량 */
  INCREMENT_SCORE_PERFECT: 25,
  /** 퀴즈 80점 이상 시 숙련도 증가량 */
  INCREMENT_SCORE_HIGH: 20,
  /** 퀴즈 60점 이상 시 숙련도 증가량 */
  INCREMENT_SCORE_PASS: 15,
  /** 기본 숙련도 증가량 (점수 없거나 60 미만) */
  INCREMENT_BASE: 10,
  /** 퀴즈 점수 분기: 만점 */
  SCORE_PERFECT: 100,
  /** 퀴즈 점수 분기: 높은 점수 */
  SCORE_HIGH: 80,
  /** 퀴즈 점수 분기: 통과 점수 */
  SCORE_PASS: 60,
  /** 망각 곡선: 반감기 (일) — 14일 후 숙련도 50% 감쇠 */
  DECAY_HALF_LIFE_DAYS: 14,
  /** 망각 곡선: 감쇠 계수 lambda = ln(2) / half_life */
  DECAY_LAMBDA: Math.LN2 / 14,
  /** 적응형 감쇠: 복습 1회당 반감기 증가 비율 */
  DECAY_REVIEW_BONUS: 0.5,
  /** 관련 엣지: Jaccard 유사도 임계값 */
  RELATED_JACCARD_THRESHOLD: 0.4,
  /** 관련 엣지: 기술 쌍당 최대 개수 */
  RELATED_MAX_PER_PAIR: 3,
  // ── 다차원 숙련도 LLM 평가 ──
  /** LLM 조정 범위: 최소 */
  LLM_ADJ_MIN: -10,
  /** LLM 조정 범위: 최대 */
  LLM_ADJ_MAX: 10,
} as const;

export const STREAK = {
  /** 주간 학습 목표 선택지 */
  VALID_TARGETS: [2, 3, 5, 7] as const,
  /** 신규 사용자 기본 주간 목표 */
  DEFAULT_TARGET: 3,
} as const;

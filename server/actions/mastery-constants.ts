// Mastery & streak configuration — shared between server actions and client components.
// NOT a "use server" file so constants can be imported in client components too.

export const MASTERY = {
  /** 숙련도 최대값 */
  MAX_LEVEL: 100,
  /** 숙련도 최소값 */
  MIN_LEVEL: 0,
  /** "마스터" 판정 기준 */
  MASTERED_THRESHOLD: 80,
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
} as const;

export const STREAK = {
  /** 주간 학습 목표 선택지 */
  VALID_TARGETS: [2, 3, 5, 7] as const,
  /** 신규 사용자 기본 주간 목표 */
  DEFAULT_TARGET: 3,
} as const;

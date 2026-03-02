// Point award amounts — shared between server actions
// Not a "use server" file so it can export constants and types

export const POINT_AWARDS = {
  MODULE_COMPLETE: 30,
  QUIZ_SCORE_80: 20,
  QUIZ_SCORE_100: 50,
  STREAK_7: 100,
  STREAK_14: 200,
  STREAK_30: 500,
  BADGE_EARNED: 200,
  ARCH_CHALLENGE: 200,
  REFACTOR_CHALLENGE: 50,
} as const;

export interface PointBalance {
  currentBalance: number;
  totalEarned: number;
}

export interface PointTransaction {
  id: string;
  amount: number;
  transactionType: string;
  sourceType: string | null;
  description: string | null;
  createdAt: string;
}

export interface RewardItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  category: string;
  purchased: boolean;
}

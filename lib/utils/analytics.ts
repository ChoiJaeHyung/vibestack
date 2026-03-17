// ─── Google Analytics 4 + Custom Event Tracking ─────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** Check if GA is loaded and configured */
function isGAEnabled(): boolean {
  return typeof window !== "undefined" && !!GA_MEASUREMENT_ID && !!window.gtag;
}

/** Track a page view */
export function trackPageView(url: string): void {
  if (!isGAEnabled()) return;
  window.gtag!("config", GA_MEASUREMENT_ID!, { page_path: url });
}

/** Track a custom event */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number,
): void {
  if (!isGAEnabled()) return;
  window.gtag!("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
}

// ─── Predefined Events ──────────────────────────────────────────────

export const analytics = {
  // Auth events
  signup: () => trackEvent("sign_up", "auth"),
  login: () => trackEvent("login", "auth"),

  // Project events
  projectCreate: (source: string) =>
    trackEvent("project_create", "project", source),
  analysisComplete: (techCount: number) =>
    trackEvent("analysis_complete", "project", undefined, techCount),

  // Learning events
  curriculumGenerate: (difficulty: string) =>
    trackEvent("curriculum_generate", "learning", difficulty),
  moduleComplete: (moduleOrder: number) =>
    trackEvent("module_complete", "learning", undefined, moduleOrder),
  quizSubmit: (score: number) =>
    trackEvent("quiz_submit", "learning", undefined, score),

  // Tutor events
  tutorChat: () => trackEvent("tutor_chat", "tutor"),

  // Conversion events
  upgradeModalView: (trigger: string) =>
    trackEvent("upgrade_modal_view", "conversion", trigger),
  upgradeClick: (trigger: string) =>
    trackEvent("upgrade_click", "conversion", trigger),
  checkoutStart: (plan: string) =>
    trackEvent("begin_checkout", "conversion", plan),

  // Engagement events
  mcpConnect: () => trackEvent("mcp_connect", "engagement"),
  streakUpdate: (days: number) =>
    trackEvent("streak_update", "engagement", undefined, days),
  badgeEarned: (badge: string) =>
    trackEvent("badge_earned", "engagement", badge),
  referralShare: () => trackEvent("referral_share", "engagement"),
};

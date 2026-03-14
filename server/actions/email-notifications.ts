"use server";

import { sendEmail } from "@/lib/email";
import {
  welcomeProTemplate,
  streakBreakTemplate,
  curriculumReadyTemplate,
  weeklyDigestTemplate,
  inactivityTemplate,
} from "@/lib/email/templates";

export async function sendWelcomeProEmail(
  email: string,
  name: string,
): Promise<void> {
  const { subject, html } = welcomeProTemplate(name);
  await sendEmail({ to: email, subject, html });
}

export async function sendStreakBreakEmail(
  email: string,
  name: string,
  currentStreak: number,
): Promise<void> {
  const { subject, html } = streakBreakTemplate(name, currentStreak);
  await sendEmail({ to: email, subject, html });
}

export async function sendCurriculumReadyEmail(
  email: string,
  name: string,
  pathTitle: string,
): Promise<void> {
  const { subject, html } = curriculumReadyTemplate(name, pathTitle);
  await sendEmail({ to: email, subject, html });
}

export async function sendWeeklyDigestEmail(
  email: string,
  name: string,
  stats: { modulesCompleted: number; quizScore: number; streakDays: number },
): Promise<void> {
  const { subject, html } = weeklyDigestTemplate(name, stats);
  await sendEmail({ to: email, subject, html });
}

export async function sendInactivityEmail(
  email: string,
  name: string,
  daysSinceActive: number,
): Promise<void> {
  const { subject, html } = inactivityTemplate(name, daysSinceActive);
  await sendEmail({ to: email, subject, html });
}

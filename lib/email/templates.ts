// ─── Email HTML templates ────────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
  background: #0f0f14;
  color: #e4e4e7;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background: #8b5cf6;
  color: #ffffff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
`;

const footerStyle = `
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #27272a;
  font-size: 12px;
  color: #71717a;
`;

function wrap(content: string, unsubscribeUrl?: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#09090b;">
  <div style="${baseStyle}">
    <div style="margin-bottom:24px;">
      <span style="font-size:20px;font-weight:700;color:#8b5cf6;">🎓 VibeUniv</span>
    </div>
    ${content}
    <div style="${footerStyle}">
      <p>&copy; ${new Date().getFullYear()} VibeUniv. All rights reserved.</p>
      ${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}" style="color:#71717a;">Unsubscribe from these emails</a></p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

export function welcomeProTemplate(name: string): { subject: string; html: string } {
  return {
    subject: "Welcome to VibeUniv Pro! 🎉",
    html: wrap(`
      <h1 style="font-size:24px;margin-bottom:16px;color:#f4f4f5;">Welcome to Pro, ${name}!</h1>
      <p style="margin-bottom:16px;line-height:1.6;">
        You now have unlimited access to everything VibeUniv offers:
      </p>
      <ul style="margin-bottom:24px;line-height:1.8;padding-left:20px;">
        <li>Unlimited project analysis</li>
        <li>Unlimited AI-powered learning roadmaps</li>
        <li>Unlimited AI tutor conversations</li>
        <li>Bring Your Own Key (BYOK) support</li>
      </ul>
      <a href="https://vibeuniv.com/dashboard" style="${buttonStyle}">Go to Dashboard</a>
    `),
  };
}

export function streakBreakTemplate(name: string, currentStreak: number): { subject: string; html: string } {
  return {
    subject: `Your ${currentStreak}-day streak is about to break! 🔥`,
    html: wrap(`
      <h1 style="font-size:24px;margin-bottom:16px;color:#f4f4f5;">Don't break your streak!</h1>
      <p style="margin-bottom:16px;line-height:1.6;">
        Hey ${name}, you've been on a <strong style="color:#8b5cf6;">${currentStreak}-day learning streak</strong>.
        Complete just one module today to keep it going!
      </p>
      <a href="https://vibeuniv.com/learning" style="${buttonStyle}">Continue Learning</a>
    `, "https://vibeuniv.com/settings"),
  };
}

export function curriculumReadyTemplate(name: string, pathTitle: string): { subject: string; html: string } {
  return {
    subject: "Your learning path is ready! 📚",
    html: wrap(`
      <h1 style="font-size:24px;margin-bottom:16px;color:#f4f4f5;">Your curriculum is ready!</h1>
      <p style="margin-bottom:16px;line-height:1.6;">
        Hey ${name}, your personalized learning path <strong style="color:#8b5cf6;">"${pathTitle}"</strong> has been generated.
      </p>
      <p style="margin-bottom:24px;line-height:1.6;">
        Dive in and start learning from your own code!
      </p>
      <a href="https://vibeuniv.com/learning" style="${buttonStyle}">Start Learning</a>
    `),
  };
}

export function weeklyDigestTemplate(
  name: string,
  stats: { modulesCompleted: number; quizScore: number; streakDays: number },
): { subject: string; html: string } {
  return {
    subject: `Your weekly learning recap 📊`,
    html: wrap(`
      <h1 style="font-size:24px;margin-bottom:16px;color:#f4f4f5;">Weekly Recap</h1>
      <p style="margin-bottom:24px;line-height:1.6;">Here's what you accomplished this week, ${name}:</p>
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#18181b;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#8b5cf6;">${stats.modulesCompleted}</div>
          <div style="font-size:12px;color:#a1a1aa;margin-top:4px;">Modules</div>
        </div>
        <div style="flex:1;background:#18181b;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#22c55e;">${stats.quizScore}%</div>
          <div style="font-size:12px;color:#a1a1aa;margin-top:4px;">Avg Score</div>
        </div>
        <div style="flex:1;background:#18181b;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#f59e0b;">${stats.streakDays}</div>
          <div style="font-size:12px;color:#a1a1aa;margin-top:4px;">Streak Days</div>
        </div>
      </div>
      <a href="https://vibeuniv.com/dashboard" style="${buttonStyle}">View Dashboard</a>
    `, "https://vibeuniv.com/settings"),
  };
}

export function inactivityTemplate(name: string, daysSinceActive: number): { subject: string; html: string } {
  return {
    subject: "We miss you! Come back to learning 💜",
    html: wrap(`
      <h1 style="font-size:24px;margin-bottom:16px;color:#f4f4f5;">It's been a while!</h1>
      <p style="margin-bottom:16px;line-height:1.6;">
        Hey ${name}, it's been ${daysSinceActive} days since your last learning session.
        Your projects are waiting for you!
      </p>
      <p style="margin-bottom:24px;line-height:1.6;">
        Pick up where you left off — even 10 minutes of learning makes a difference.
      </p>
      <a href="https://vibeuniv.com/learning" style="${buttonStyle}">Resume Learning</a>
    `, "https://vibeuniv.com/settings"),
  };
}

import { sendEmail } from "@/lib/email";

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

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
  background: #0f0f14;
  color: #e4e4e7;
`;

function wrap(content: string): string {
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
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #27272a;font-size:12px;color:#71717a;">
      <p>&copy; ${new Date().getFullYear()} VibeUniv. All rights reserved.</p>
      <p><a href="https://vibeuniv.com/settings" style="color:#71717a;">Manage email preferences</a></p>
    </div>
  </div>
</body>
</html>`;
}

/** Day 0: Welcome email sent immediately after signup */
export async function sendOnboardingDay0(email: string, name: string): Promise<void> {
  const html = wrap(`
    <h1 style="font-size:24px;margin-bottom:16px;color:#f4f4f5;">Welcome to VibeUniv, ${name}! 🎉</h1>
    <p style="margin-bottom:16px;line-height:1.6;">
      You just took the first step to truly understanding the code you build with AI.
    </p>
    <p style="margin-bottom:8px;font-weight:600;color:#f4f4f5;">Here's how to get started in 2 minutes:</p>
    <div style="background:#18181b;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin-bottom:8px;"><strong style="color:#8b5cf6;">Step 1:</strong> Connect your project via MCP or file upload</p>
      <p style="margin-bottom:8px;"><strong style="color:#8b5cf6;">Step 2:</strong> AI analyzes your tech stack automatically</p>
      <p style="margin-bottom:0;"><strong style="color:#8b5cf6;">Step 3:</strong> Get a personalized learning roadmap</p>
    </div>
    <a href="https://vibeuniv.com/dashboard" style="${buttonStyle}">Go to Dashboard</a>
  `);

  await sendEmail({ to: email, subject: "Welcome to VibeUniv! Get started in 2 minutes 🚀", html });
}

/** Day 1: MCP setup reminder */
export async function sendOnboardingDay1(email: string, name: string): Promise<void> {
  const html = wrap(`
    <h1 style="font-size:24px;margin-bottom:16px;color:#f4f4f5;">Connect your first project 🔗</h1>
    <p style="margin-bottom:16px;line-height:1.6;">
      Hey ${name}, the fastest way to start learning is to connect your project.
    </p>
    <p style="margin-bottom:16px;line-height:1.6;">
      If you use <strong>Claude Code</strong> or <strong>Cursor</strong>, it takes just 30 seconds with MCP:
    </p>
    <div style="background:#18181b;border-radius:12px;padding:16px;margin-bottom:24px;font-family:monospace;font-size:13px;color:#a1a1aa;">
      claude mcp add vibeuniv -- npx @vibeuniv/mcp-server
    </div>
    <p style="margin-bottom:24px;line-height:1.6;color:#a1a1aa;">
      Or you can upload files directly from the Projects page.
    </p>
    <a href="https://vibeuniv.com/projects" style="${buttonStyle}">Connect a Project</a>
  `);

  await sendEmail({ to: email, subject: `${name}, connect your project in 30 seconds ⚡`, html });
}

/** Day 3: First analysis nudge */
export async function sendOnboardingDay3(email: string, name: string): Promise<void> {
  const html = wrap(`
    <h1 style="font-size:24px;margin-bottom:16px;color:#f4f4f5;">Your code is waiting to teach you 📚</h1>
    <p style="margin-bottom:16px;line-height:1.6;">
      Hey ${name}, did you know that VibeUniv creates learning paths from YOUR actual code?
    </p>
    <p style="margin-bottom:16px;line-height:1.6;">
      Here's what other vibe coders discovered:
    </p>
    <ul style="margin-bottom:24px;line-height:1.8;padding-left:20px;color:#d4d4d8;">
      <li>Why their Next.js app uses server components</li>
      <li>How Supabase RLS policies protect their data</li>
      <li>What their authentication flow actually does</li>
    </ul>
    <a href="https://vibeuniv.com/learning" style="${buttonStyle}">Start Learning</a>
  `);

  await sendEmail({ to: email, subject: `${name}, discover what's inside your code 🔍`, html });
}

/** Day 7: AI Tutor introduction */
export async function sendOnboardingDay7(email: string, name: string): Promise<void> {
  const html = wrap(`
    <h1 style="font-size:24px;margin-bottom:16px;color:#f4f4f5;">Meet your AI Tutor 🤖</h1>
    <p style="margin-bottom:16px;line-height:1.6;">
      Hey ${name}, one week in! Have you tried the AI Tutor yet?
    </p>
    <p style="margin-bottom:16px;line-height:1.6;">
      Unlike ChatGPT, VibeUniv's tutor knows YOUR code. Select any text in a learning module and ask:
    </p>
    <div style="background:#18181b;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin-bottom:8px;color:#d4d4d8;">💬 "Why does this function use async/await?"</p>
      <p style="margin-bottom:8px;color:#d4d4d8;">💬 "What would happen if I removed this middleware?"</p>
      <p style="margin-bottom:0;color:#d4d4d8;">💬 "Explain this database query step by step"</p>
    </div>
    <p style="margin-bottom:24px;line-height:1.6;">
      Free tier includes 20 conversations/month — plenty to explore!
    </p>
    <a href="https://vibeuniv.com/learning" style="${buttonStyle}">Try AI Tutor</a>
  `);

  await sendEmail({ to: email, subject: `${name}, your AI tutor is ready to help 🎓`, html });
}

import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = "VibeUniv <noreply@vibeuniv.com>";

export type EmailTemplate =
  | "welcome-pro"
  | "streak-break"
  | "curriculum-ready"
  | "weekly-digest"
  | "inactivity";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured, skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Send failed:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return { success: false, error: "Failed to send email" };
  }
}

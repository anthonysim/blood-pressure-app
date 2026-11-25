import "server-only";

export type Email = { to: string; subject: string; html: string; text: string };

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "BP Tracker <no-reply@anthonysim.dev>";

/** Sends through Resend. Without RESEND_API_KEY outside production, logs the email instead. */
export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.info(`[email] RESEND_API_KEY not set; not sending.\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`);
    return;
  }

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || DEFAULT_FROM, ...email, to: [email.to] }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`Resend ${res.status}: ${body?.message ?? res.statusText}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function passwordResetEmail({ name, url }: { name: string; url: string }): Omit<Email, "to"> {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);
  return {
    subject: "Reset your BP Tracker password",
    text: [
      `Hi ${name},`,
      "",
      "We got a request to reset your BP Tracker password. Open this link to choose a new one:",
      url,
      "",
      "The link expires in 1 hour. If you didn't ask for this, you can ignore this email; your password won't change.",
    ].join("\n"),
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1f">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
          <tr><td style="font-size:18px;font-weight:600;padding-bottom:16px">BP Tracker</td></tr>
          <tr><td style="font-size:15px;line-height:1.5;padding-bottom:8px">Hi ${safeName},</td></tr>
          <tr><td style="font-size:15px;line-height:1.5;padding-bottom:24px">We got a request to reset your password. Click below to choose a new one.</td></tr>
          <tr><td style="padding-bottom:24px">
            <a href="${safeUrl}" style="display:inline-block;background:#2f6f6a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px">Reset password</a>
          </td></tr>
          <tr><td style="font-size:13px;line-height:1.5;color:#6b6b75">This link expires in 1 hour. If you didn't ask for this, ignore this email; your password won't change.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

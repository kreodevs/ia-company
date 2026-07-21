import { getPlatformSettingsSync } from "./platform-settings.js";

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
  tenantName: string;
}): Promise<void> {
  const { to, name, resetUrl, tenantName } = params;
  const subject = `Reset your ${tenantName} password`;
  const html = `<p>Hi ${name},</p><p>Reset your password for <strong>${tenantName}</strong>:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`;

  const { resendApiKey, emailFrom } = getPlatformSettingsSync();

  if (resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: emailFrom, to, subject, html }),
    });
    if (!res.ok) {
      console.warn("[email] Resend failed:", await res.text());
    }
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[email] To: ${to} | ${subject} | ${resetUrl}`);
  }
}

export async function sendRunNotificationEmail(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<void> {
  const { resendApiKey, emailFrom } = getPlatformSettingsSync();
  if (!resendApiKey || params.to.length === 0) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });
}

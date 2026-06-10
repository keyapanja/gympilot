/** Plain, dependency-free HTML email templates (inline styles for client support). */

const BRAND = "#10b981";

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title></head>
<body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:${BRAND};padding:20px 28px;">
          <span style="color:#fff;font-size:18px;font-weight:700;">GymPilot</span>
        </td></tr>
        <tr><td style="padding:28px;">${bodyHtml}</td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
          Personalized workout guidance for every gym member.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">${label}</a>`;
}

export function welcomeOwnerEmail(params: { name: string; gymName: string; loginUrl: string }) {
  return {
    subject: `Welcome to GymPilot, ${params.name}!`,
    html: shell(
      "Welcome to GymPilot",
      `<h1 style="font-size:20px;margin:0 0 12px;">Welcome aboard 🎉</h1>
       <p style="margin:0 0 16px;line-height:1.6;">Your workspace <strong>${params.gymName}</strong> is ready.
       Add members, assign workout plans, and track progress — all in one place.</p>
       <p style="margin:0 0 24px;">${button(params.loginUrl, "Go to your dashboard")}</p>
       <p style="margin:0;color:#64748b;font-size:13px;">Tip: start by adding your first member.</p>`,
    ),
  };
}

export function memberInviteEmail(params: { name: string; gymName: string; inviteUrl: string }) {
  return {
    subject: `${params.gymName} invited you to GymPilot`,
    html: shell(
      "You're invited",
      `<h1 style="font-size:20px;margin:0 0 12px;">Hi ${params.name},</h1>
       <p style="margin:0 0 16px;line-height:1.6;"><strong>${params.gymName}</strong> has set up a personalized
       training space for you on GymPilot. Set your password to view your workout plan and start tracking progress.</p>
       <p style="margin:0 0 24px;">${button(params.inviteUrl, "Set your password")}</p>
       <p style="margin:0;color:#64748b;font-size:13px;">If you didn't expect this, you can ignore this email.</p>`,
    ),
  };
}

export function passwordResetEmail(params: { resetUrl: string }) {
  return {
    subject: "Reset your GymPilot password",
    html: shell(
      "Reset your password",
      `<h1 style="font-size:20px;margin:0 0 12px;">Password reset</h1>
       <p style="margin:0 0 16px;line-height:1.6;">We received a request to reset your password.
       Click below to choose a new one. This link expires shortly.</p>
       <p style="margin:0 0 24px;">${button(params.resetUrl, "Reset password")}</p>
       <p style="margin:0;color:#64748b;font-size:13px;">Didn't request this? You can safely ignore it.</p>`,
    ),
  };
}

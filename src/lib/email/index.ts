import "server-only";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { memberInviteEmail, passwordResetEmail, welcomeOwnerEmail } from "./templates";

/**
 * Email dispatch with three transports, chosen automatically:
 *   1. SMTP (Gmail / Brevo / Mailgun / …) when SMTP_HOST is set — no domain needed.
 *   2. Resend when RESEND_API_KEY is set.
 *   3. Dry-run (default) — logs the message + action link to the console so the
 *      app is fully runnable, and you can complete flows without any provider.
 * EMAIL_DRY_RUN=true forces dry-run regardless of configured providers.
 */
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const smtpTransport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

async function send(to: string, subject: string, html: string, actionUrl?: string): Promise<void> {
  if (env.EMAIL_DRY_RUN || (!smtpTransport && !resend)) {
    // Dry-run: print the message AND any action link so you can complete the
    // flow without an email provider — just copy the link from the terminal.
    console.info(`\n[email:dry-run] → ${to}\n  subject: ${subject}`);
    if (actionUrl) console.info(`  link:    ${actionUrl}\n`);
    return;
  }
  try {
    if (smtpTransport) {
      await smtpTransport.sendMail({ from: env.EMAIL_FROM, to, subject, html });
    } else if (resend) {
      await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
    }
  } catch (err) {
    // Never let a transactional email failure break the core flow.
    console.error("[email] send failed:", err);
  }
}

export async function sendWelcomeOwner(to: string, name: string, gymName: string) {
  const { subject, html } = welcomeOwnerEmail({ name, gymName, loginUrl: `${env.NEXT_PUBLIC_SITE_URL}/owner/dashboard` });
  await send(to, subject, html);
}

export async function sendMemberInvite(to: string, name: string, gymName: string, inviteUrl: string) {
  const { subject, html } = memberInviteEmail({ name, gymName, inviteUrl });
  await send(to, subject, html, inviteUrl);
}

export async function sendPasswordReset(to: string, resetUrl: string) {
  const { subject, html } = passwordResetEmail({ resetUrl });
  await send(to, subject, html, resetUrl);
}

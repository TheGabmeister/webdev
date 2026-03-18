import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function getBackendUrl() {
  return process.env.BACKEND_URL || `http://localhost:${process.env.PORT || '3001'}`;
}

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${getBackendUrl()}/api/auth/verify-email?token=${token}`;
  const client = getResend();

  if (!client) {
    console.log(`\n[DEV] Verification email for ${to}`);
    console.log(`[DEV] Link: ${link}\n`);
    return;
  }

  await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Verify your email',
    html: `<p>Click the link below to verify your email:</p><p><a href="${link}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const client = getResend();

  if (!client) {
    console.log(`\n[DEV] Password reset email for ${to}`);
    console.log(`[DEV] Link: ${link}\n`);
    return;
  }

  await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Reset your password',
    html: `<p>Click the link below to reset your password:</p><p><a href="${link}">Reset Password</a></p><p>This link expires in 1 hour.</p>`,
  });
}

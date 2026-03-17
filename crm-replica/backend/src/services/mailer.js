import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport;

function hasSmtpConfig() {
  return Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.smtpFrom);
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: Number(env.smtpPort) === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    });
  }
  return transport;
}

export async function sendEmail({ to, subject, html }) {
  if (!hasSmtpConfig()) {
    // eslint-disable-next-line no-console
    console.log(`[mailer:fallback] Missing SMTP config. Email to ${to} not sent.`);
    // eslint-disable-next-line no-console
    console.log(`[mailer:fallback] subject="${subject}" html=${html}`);
    return { ok: false, fallback: true };
  }

  const tx = getTransport();
  await tx.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html
  });
  return { ok: true, fallback: false };
}

export async function sendPasswordResetEmail({ to, resetLink }) {
  const subject = 'Restablecer contraseña - DCM Service CRM';
  const html = `
    <p>Recibiste una solicitud para restablecer tu contraseña.</p>
    <p><a href="${resetLink}">Restablecer contraseña</a></p>
    <p>Este enlace expira en 1 hora.</p>
  `;

  return sendEmail({ to, subject, html });
}

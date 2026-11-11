import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

function getTransport() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

/** One shared SMTP sender for the contact form and every tracking notification. */
export async function sendMail(mail: Mail) {
  if (!smtpConfigured()) {
    // Local testing: save the email as a file instead of sending it.
    const dir = process.env.EMAIL_PREVIEW_DIR;
    if (dir && process.env.VERCEL !== "1") {
      await mkdir(dir, { recursive: true });
      const name = `${Date.now()}-${mail.subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}`;
      await writeFile(path.join(dir, `${name}.html`), mail.html);
      await writeFile(
        path.join(dir, `${name}.txt`),
        `To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`,
      );
      return;
    }
    throw new Error("SMTP is not configured (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).");
  }
  await getTransport().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    ...mail,
  });
}

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

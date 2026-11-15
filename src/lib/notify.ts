import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Emails to the site owner (contact messages, listing requests), sent through Google
// Workspace (example.com's mail) with an app password. The address only lives here on
// the server and is never sent to browsers. Without SMTP settings, messages still land in /admin.

const USER = process.env.SMTP_USER || undefined; // the Workspace account that sends, e.g. you@example.com
const PASS = process.env.SMTP_PASS || undefined; // a Google app password for that account (16 letters)
const TO = process.env.CONTACT_TO || USER || "you@example.com";
const FROM = process.env.CONTACT_FROM || (USER ? `Seeker <${USER}>` : undefined);

let transport: Transporter | undefined;

export const emailConfigured = () => !!(USER && PASS);

/** True when sent. Never throws: the message is already saved. */
export async function notifyOwner(subject: string, text: string, replyTo?: string): Promise<boolean> {
  if (!USER || !PASS) return false;
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: USER, pass: PASS },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  try {
    await transport.sendMail({ from: FROM, to: TO, subject, text, ...(replyTo ? { replyTo } : {}) });
    return true;
  } catch (error) {
    console.error("email failed", error);
    return false;
  }
}

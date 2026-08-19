import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

type MailInput = { to: string; subject: string; text: string };

export async function sendMail(input: MailInput) {
  if (!env.SMTP_HOST) {
    console.info(JSON.stringify({ event: "auth_email", ...input }));
    return;
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  await transport.sendMail({ from: env.MAIL_FROM, ...input });
}

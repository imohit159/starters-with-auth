import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../shared/logger/logger";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(message: MailMessage) {
  if (!env.SMTP_HOST) {
    logger.info("mail_console", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth:
      env.SMTP_USER.length > 0
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}

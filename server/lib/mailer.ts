import nodemailer from "nodemailer";
import { env } from "./env";
import { AppError } from "./errors";

type SendMailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function createTransport() {
  if (!env.MAIL_HOST || !env.MAIL_PORT || !env.MAIL_USER || !env.MAIL_PASS) {
    throw new AppError(
      "MAIL_CONFIG_INVALID",
      "MAIL_HOST, MAIL_PORT, MAIL_USER and MAIL_PASS are required",
      500,
    );
  }

  return nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE ?? false,
    auth: {
      user: env.MAIL_USER,
      pass: env.MAIL_PASS,
    },
  });
}

export async function sendMail(payload: SendMailPayload) {
  const transporter = createTransport();
  const from = env.MAIL_FROM ?? env.MAIL_USER;

  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

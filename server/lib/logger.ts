import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  base: undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.password_hash",
      "req.body.code",
      "req.body.otp",
      "req.body.sessionId",
    ],
    censor: "[REDACTED]",
  },
});

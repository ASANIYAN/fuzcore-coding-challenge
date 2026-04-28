import { z } from "zod";

const optionalString = z.preprocess(
  (value) =>
    value === undefined || value === null || value === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);

const optionalBoolean = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
      }
    }

    return value;
  },
  z.boolean().optional(),
);

const optionalPort = z.preprocess(
  (value) =>
    value === undefined || value === null || value === "" ? undefined : value,
  z.coerce.number().int().min(1).max(65535).optional(),
);

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  HMAC_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  HOST: optionalString,
  MAIL_HOST: optionalString,
  MAIL_PORT: optionalPort,
  MAIL_SECURE: optionalBoolean,
  MAIL_USER: optionalString,
  MAIL_PASS: optionalString,
  MAIL_FROM: optionalString,
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});

export const dbEnvSchema = envSchema.pick({
  DATABASE_URL: true,
});

export type Env = z.infer<typeof envSchema>;
export type DbEnv = z.infer<typeof dbEnvSchema>;

export function parseEnv(input: unknown): Env {
  return envSchema.parse(input);
}

export function parseDbEnv(input: unknown): DbEnv {
  return dbEnvSchema.parse(input);
}

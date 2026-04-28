import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";
import { getRedisClient } from "../lib/redis";

const RATE_LIMIT_RULES: Record<string, { max: number; windowSeconds: number }> = {
  "auth-signup": { max: 5, windowSeconds: 15 * 60 },
  "auth-verify-email": { max: 10, windowSeconds: 15 * 60 },
  "auth-login": { max: 10, windowSeconds: 15 * 60 },
  "auth-forgot-password": { max: 5, windowSeconds: 15 * 60 },
  "auth-reset-password": { max: 10, windowSeconds: 15 * 60 },
};

export const rateLimit = (_key: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const key = _key in RATE_LIMIT_RULES ? _key : "default";
      const rule =
        RATE_LIMIT_RULES[key] ??
        ({
          max: 60,
          windowSeconds: 60,
        } as const);
      const redis = getRedisClient();
      const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
      const rateLimitKey = `rate-limit:${key}:${clientIp}`;

      const count = await redis.incr(rateLimitKey);
      if (count === 1) {
        await redis.expire(rateLimitKey, rule.windowSeconds);
      }

      if (count > rule.max) {
        throw new AppError(
          "RATE_LIMITED",
          "Too many requests. Please try again later.",
          429,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

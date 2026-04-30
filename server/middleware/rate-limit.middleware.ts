import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";
import { getRedisClient } from "../lib/redis";

const RATE_LIMIT_RULES: Record<string, { max: number; windowSeconds: number }> =
  {
    "auth-strict": { max: 200, windowSeconds: 15 * 60 },
    "moderate-user-hourly": { max: 20, windowSeconds: 60 * 60 },
    "invoice-resend-hourly": { max: 10, windowSeconds: 60 * 60 },
    "standard-user-minute": { max: 100, windowSeconds: 60 },
  };

export const rateLimit = (ruleKey: keyof typeof RATE_LIMIT_RULES) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const rule = RATE_LIMIT_RULES[ruleKey];
      const redis = getRedisClient();
      const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
      const principal =
        ruleKey === "auth-strict"
          ? String(clientIp)
          : (req.user?.id ?? String(clientIp));
      const rateLimitKey = `rate-limit:${ruleKey}:${principal}`;

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

import type { NextFunction, Request, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import { UnauthorizedError } from "../lib/errors";
import { SESSION_COOKIE_NAME } from "../lib/session";
import { sessions, users } from "../../shared/schema";

function getCookieValue(cookieHeader: string, name: string) {
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey !== name) {
      continue;
    }

    return decodeURIComponent(rest.join("="));
  }

  return null;
}

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== "string") {
    throw new UnauthorizedError();
  }

  const sessionId = getCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  if (!sessionId) {
    throw new UnauthorizedError();
  }

  void (async () => {
    const now = new Date();
    const rows = await db
      .select({
        sessionId: sessions.id,
        userId: users.id,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.id, sessionId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
        ),
      )
      .limit(1);

    const session = rows[0];
    if (!session) {
      throw new UnauthorizedError();
    }

    req.sessionId = session.sessionId;
    req.user = {
      id: session.userId,
      email: session.email,
      emailVerifiedAt: session.emailVerifiedAt,
    };

    next();
  })().catch(next);
};

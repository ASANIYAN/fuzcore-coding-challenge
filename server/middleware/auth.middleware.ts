import type { NextFunction, Request, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import { UnauthorizedError, UserNotVerifiedError } from "../lib/errors";
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
  void attachSessionFromRequest(req)
    .then((authenticated) => {
      if (!authenticated) {
        throw new UnauthorizedError();
      }
      next();
    })
    .catch(next);
};

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  void attachSessionFromRequest(req)
    .then(() => next())
    .catch(next);
};

export const requireVerifiedUser = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  if (!req.user.emailVerifiedAt) {
    return next(new UserNotVerifiedError());
  }

  return next();
};

async function attachSessionFromRequest(req: Request) {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== "string") {
    return false;
  }

  const sessionId = getCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  if (!sessionId) {
    return false;
  }
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
    return false;
  }

  req.sessionId = session.sessionId;
  req.user = {
    id: session.userId,
    email: session.email,
    emailVerifiedAt: session.emailVerifiedAt,
  };

  return true;
}

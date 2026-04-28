import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors";

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const hasSessionCookie = typeof req.headers.cookie === "string";
  if (!hasSessionCookie) {
    throw new UnauthorizedError();
  }

  next();
};

import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const requestIdMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  req.requestId = crypto.randomUUID();
  next();
};

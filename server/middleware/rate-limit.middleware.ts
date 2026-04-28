import type { NextFunction, Request, Response } from "express";

export const rateLimit = (_key: string) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Placeholder: wire Redis-backed limits in a follow-up slice.
    next();
  };
};

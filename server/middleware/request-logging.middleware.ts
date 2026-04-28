import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export const requestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;

    logger.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
      },
      "request completed",
    );
  });

  next();
};

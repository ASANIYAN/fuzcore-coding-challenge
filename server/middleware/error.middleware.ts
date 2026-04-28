import type { ErrorRequestHandler } from "express";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

export const globalErrorMiddleware: ErrorRequestHandler = (
  err,
  req,
  res,
  _next,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  logger.error(
    {
      err,
      requestId: req.requestId,
      method: req.method,
      path: req.path,
    },
    "unhandled error",
  );

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      details: [],
    },
  });
};

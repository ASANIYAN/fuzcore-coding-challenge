import type { ErrorRequestHandler } from "express";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

export const globalErrorMiddleware: ErrorRequestHandler = (
  err,
  req,
  res,
  _next,
) => {
  const parseError = err as {
    type?: string;
    status?: number;
    expose?: boolean;
  };

  if (
    parseError?.type === "entity.parse.failed" ||
    (parseError?.status === 400 && parseError?.expose === true)
  ) {
    return res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Invalid JSON payload.",
        details: [
          {
            path: [],
            message: "Request body must be valid JSON.",
          },
        ],
      },
    });
  }

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

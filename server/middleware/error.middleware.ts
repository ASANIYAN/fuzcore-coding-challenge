import type { ErrorRequestHandler } from "express";
import { AppError } from "../lib/errors";
import { env } from "../lib/env";
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

  const dbError = err as {
    code?: string;
    detail?: string;
    message?: string;
  };

  if (dbError?.code === "23505") {
    return res.status(409).json({
      success: false,
      error: {
        code: "CONFLICT",
        message: dbError.detail || "Duplicate resource already exists.",
        details: [],
      },
    });
  }

  if (dbError?.code === "23503" || dbError?.code === "23514") {
    return res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: dbError.detail || "Request violates a database constraint.",
        details: [],
      },
    });
  }

  if (
    dbError?.code === "22P02" ||
    dbError?.code === "22007" ||
    dbError?.code === "22003" ||
    dbError?.code === "22023"
  ) {
    return res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: dbError.message || "Invalid input value in request.",
        details: [],
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

  const unknownError = err as { message?: string };
  const isProduction = env.NODE_ENV === "production";

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        !isProduction && typeof unknownError.message === "string"
          ? unknownError.message
          : "An unexpected error occurred",
      details: [],
    },
  });
};

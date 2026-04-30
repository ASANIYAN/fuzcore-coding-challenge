import type { NextFunction, Request, Response } from "express";
import sanitizeHtml from "sanitize-html";

function sanitizeValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return sanitizeHtml(trimmed, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    const sanitizedEntries = Object.entries(value).map(([key, child]) => [
      key,
      sanitizeValue(child),
    ]);
    return Object.fromEntries(sanitizedEntries);
  }

  return value;
}

export const sanitizeMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
};

import type { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../lib/errors";

const MAX_CSV_BYTES = 1024 * 1024 * 2;

function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=([^;]+)/i);
  return match?.[1]?.trim() ?? null;
}

function normalizeFilename(filename: string) {
  return filename.replace(/^["']|["']$/g, "").trim();
}

function parseMultipartCsv(
  bodyBuffer: Buffer,
  boundary: string,
): { filename: string; content: string } {
  const body = bodyBuffer.toString("utf8");
  const boundaryToken = `--${boundary}`;
  const parts = body
    .split(boundaryToken)
    .map((part) => part.trim())
    .filter((part) => part && part !== "--");

  for (const part of parts) {
    const [rawHeaders, ...rawContentParts] = part.split("\r\n\r\n");
    if (!rawHeaders || rawContentParts.length === 0) {
      continue;
    }

    const content = rawContentParts.join("\r\n\r\n").replace(/\r\n--$/, "");
    const dispositionLine = rawHeaders
      .split("\r\n")
      .find((line) => line.toLowerCase().startsWith("content-disposition:"));
    if (!dispositionLine) {
      continue;
    }

    const filenameMatch = dispositionLine.match(/filename=([^;]+)/i);
    if (!filenameMatch) {
      continue;
    }

    const filename = normalizeFilename(filenameMatch[1] ?? "");
    if (!filename) {
      throw new BadRequestError("Uploaded CSV file must have a filename");
    }
    if (!filename.toLowerCase().endsWith(".csv")) {
      throw new BadRequestError("Only .csv files are allowed for import");
    }

    return { filename, content: content.trim() };
  }

  throw new BadRequestError("CSV file is required in multipart form-data");
}

export function csvUploadMiddleware(req: Request, _res: Response, next: NextFunction) {
  const contentType = req.headers["content-type"];
  if (!contentType || !contentType.toLowerCase().includes("multipart/form-data")) {
    return next(new BadRequestError("Content-Type must be multipart/form-data"));
  }

  const boundary = extractBoundary(contentType);
  if (!boundary) {
    return next(new BadRequestError("Missing multipart boundary"));
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    return next(new BadRequestError("CSV file is required"));
  }
  if (rawBody.length === 0) {
    return next(new BadRequestError("CSV file cannot be empty"));
  }
  if (rawBody.length > MAX_CSV_BYTES) {
    return next(new BadRequestError("CSV file exceeds 2MB size limit"));
  }

  try {
    req.uploadedCsv = parseMultipartCsv(rawBody, boundary);
    return next();
  } catch (error) {
    return next(error);
  }
}


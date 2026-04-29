export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = "AppError";
  }
}

type ValidationIssueLike = {
  path?: unknown;
  message?: unknown;
};

type ValidationDetail = {
  path: Array<string | number>;
  message: string;
};

function toPathArray(path: unknown): Array<string | number> {
  if (!Array.isArray(path)) {
    return [];
  }

  return path.filter(
    (part): part is string | number =>
      typeof part === "string" || typeof part === "number",
  );
}

function prettifyFieldName(path: Array<string | number>): string {
  const raw = path[path.length - 1];
  if (typeof raw !== "string" || raw.length === 0) {
    return "Field";
  }

  const withSpaces = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function normalizeValidationMessage(
  original: string,
  path: Array<string | number>,
): string {
  const fieldName = prettifyFieldName(path);
  const trimmed = original.trim();

  if (trimmed === "Required") {
    return `${fieldName} is required`;
  }
  if (trimmed.startsWith("String ")) {
    return `${fieldName} ${trimmed.slice("String ".length)}`;
  }
  if (trimmed.startsWith("Number ")) {
    return `${fieldName} ${trimmed.slice("Number ".length)}`;
  }

  return trimmed;
}

function normalizeValidationDetails(details: unknown[]): ValidationDetail[] {
  return details.map((detail) => {
    const issue = detail as ValidationIssueLike;
    const path = toPathArray(issue.path);
    const message =
      typeof issue.message === "string"
        ? normalizeValidationMessage(issue.message, path)
        : "Invalid value";

    return { path, message };
  });
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown[]) {
    super(
      "VALIDATION_ERROR",
      "Validation failed",
      400,
      normalizeValidationDetails(details),
    );
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super("BAD_REQUEST", message, 400);
  }
}

export class NotImplementedError extends AppError {
  constructor(message = "Not implemented") {
    super("NOT_IMPLEMENTED", message, 501);
  }
}

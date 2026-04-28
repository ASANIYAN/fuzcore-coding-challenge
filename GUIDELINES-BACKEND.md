# Development & AI Collaboration Guidelines

---

## 1. Architectural Pattern: Modular Express

This is an Express app following the **Module → Router → Controller → Service** pattern to enforce a clean separation of concerns.

```
server/
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.schema.ts       # Zod request schemas (extended from drizzle-zod)
│   ├── customers/
│   ├── categories/
│   ├── transactions/
│   ├── invoices/
│   └── dashboard/
├── db/
│   ├── schema/                  # Drizzle table definitions
│   └── index.ts                 # DB connection
├── lib/
│   ├── currency.ts              # BIGINT conversion helpers
│   ├── mailer.ts                # Email dispatch
│   ├── queue.ts                 # BullMQ setup
│   ├── hmac.ts                  # OTP hashing
│   └── errors.ts                # Custom error classes
├── middleware/
│   ├── auth.middleware.ts        # Session validation, attaches user to request
│   ├── error.middleware.ts       # Global error handler
│   ├── rate-limit.middleware.ts  # Tiered rate limiting
│   └── validate.middleware.ts   # Zod request validation
├── workers/
│   └── email.worker.ts          # BullMQ email job consumer
└── app.ts                       # Express app bootstrap
```

### Layer Responsibilities

**Routes** — Mount middleware and delegate to controllers. No logic.

**Controllers** — Handle HTTP concerns only: parse params and body, call the service, return the response. Never touch the database directly.

**Services** — Own all business logic: DB queries via Drizzle, money conversions, state transitions, queue interactions. No HTTP knowledge.

**Schema** — Zod validation schemas per module, generated from drizzle-zod and extended with request-specific rules.

---

## 2. Dependency Injection

Without NestJS's DI container, use **manual constructor injection**. Instantiate services and pass them into controllers at the module level.

```ts
// modules/auth/auth.routes.ts
const authService = new AuthService(db);
const authController = new AuthController(authService);

router.post("/signup", authController.signup);
```

This keeps controllers and services independently testable. A controller test can receive a mock service. A service test can receive a mock DB. Neither is coupled to Express or the database directly.

---

## 3. Global Error Handling

No `try/catch` blocks in controllers. Services throw typed custom errors. The global error middleware catches everything and maps it to the correct HTTP response.

### Custom Error Classes

```ts
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = "AppError";
  }
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
    super("VALIDATION_ERROR", "Validation failed", 400, details);
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super("INVALID_TRANSITION", `Cannot transition from ${from} to ${to}`, 422);
  }
}
```

### Global Error Middleware

```ts
// middleware/error.middleware.ts
export const globalErrorMiddleware: ErrorRequestHandler = (
  err,
  req,
  res,
  next,
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

  // Log unexpected errors with full context
  logger.error({ err, requestId: req.requestId }, "Unhandled error");

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      details: [],
    },
  });
};
```

Register this **last** in `app.ts`, after all routes.

---

## 4. Request Validation

Validation runs via middleware before the controller is reached. Zod schemas are defined per module.

```ts
// middleware/validate.middleware.ts
export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(result.error.errors);
    }
    req.body = result.data; // replace with parsed + typed data
    next();
  };
```

Usage in routes:

```ts
router.post("/signup", validate(signupSchema), authController.signup);
```

Drizzle-zod generates base schemas from table definitions. Extend them per endpoint:

```ts
// modules/auth/auth.schema.ts
export const signupSchema = createInsertSchema(users)
  .pick({
    email: true,
    password: true,
  })
  .extend({
    password: z.string().min(8),
  });
```

---

## 5. Money Handling

All monetary values are stored as `BIGINT` in the database (smallest currency unit — cents, kobo, pence). Conversion happens only at the application boundary.

```ts
// lib/currency.ts
const CURRENCY_SCALE: Record<string, number> = {
  USD: 100,
  GBP: 100,
  EUR: 100,
  NGN: 100,
  KWD: 1000,
};

export const toMinorUnits = (amount: number, currency: string): bigint => {
  const scale = CURRENCY_SCALE[currency] ?? 100;
  return BigInt(Math.round(amount * scale));
};

export const toDecimal = (amount: bigint, currency: string): number => {
  const scale = CURRENCY_SCALE[currency] ?? 100;
  return Number(amount) / scale;
};
```

Rules:

- Controllers receive decimal amounts from the client, pass them to services
- Services call `toMinorUnits` before writing to the DB
- Services call `toDecimal` before returning to the controller
- Never perform arithmetic on raw decimal amounts — always convert first

---

## 6. Response Shape

All responses follow a consistent envelope.

```ts
// lib/response.ts
export const success = <T>(data: T, meta?: Record<string, unknown>) => ({
  success: true,
  data,
  meta: meta ?? {},
});

export const paginated = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) => ({
  success: true,
  data,
  meta: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});
```

Controllers use these helpers directly:

```ts
return res.status(200).json(success(customer));
return res.status(200).json(paginated(customers, total, page, limit));
```

---

## 7. Specific Feature Rules

### Auth

- Passwords hashed with **bcrypt** (minimum cost factor 12) before storage
- OTPs hashed with **HMAC-SHA256** using the `HMAC_SECRET` env variable before storage
- Sessions are HTTP-only cookies carrying the session UUID
- All active sessions must be revoked on password reset
- `superseded_at` stamped on old OTP when a new one is requested

### Money

- Always `BIGINT` in the DB and service layer
- `toMinorUnits` on the way in, `toDecimal` on the way out
- Currency validated against ISO 4217 at the Zod layer and enforced by DB CHECK constraint

### Invoices

- State machine enforced at the **DB trigger level** — do not replicate transition logic in the application layer
- Valid transitions: `draft → sent`, `draft → void`, `sent → paid`, `sent → void`
- `paid` and `void` are terminal — no further transitions
- Invoice + line items created atomically in a single DB transaction
- Totals and subtotals always derived at query time, never stored
- `PATCH /invoices/:id` is only permitted when status is `draft`

### Validation

- Every request validated with Zod at the route level via the `validate` middleware
- Validation runs before the controller function is invoked
- Validated and typed body replaces `req.body` so downstream code is fully typed

---

## 8. Environment Validation

All environment variables are validated at startup using Zod before the server begins listening. The server must not start if any required variable is missing or malformed.

```ts
// lib/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  HMAC_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]),
  EMAIL_API_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);
```

Import `env` from this module everywhere — never read `process.env` directly.

---

## 9. Logging

**Library:** Pino. Every log entry includes a `requestId` attached per request via middleware.

```ts
// middleware/request-id.middleware.ts
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  req.requestId = crypto.randomUUID();
  next();
};
```

What to log:

- Every request and response (method, path, status, duration)
- Auth events (signup, login, logout, failures)
- Invoice lifecycle transitions
- Queue events (enqueued, success, failure, retry)
- Webhook events (received, verified, processed)
- Unhandled errors with full stack trace

What to never log:

- Passwords, password hashes, OTP codes, session IDs
- Request bodies on auth endpoints
- Stripe secrets or webhook signing keys

---

## 10. Git & Branching Strategy

### Branch Structure

```
main
└── feat/auth
└── feat/customers
└── feat/categories
└── feat/transactions
└── feat/invoices
└── feat/dashboard
└── feat/pdf-export
└── feat/csv-import
└── feat/payment-links
```

One branch per core feature. Branch from `main`, merge back when the full module is complete and manually verified.

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat(auth): implement signup endpoint with OTP dispatch
feat(auth): implement email verification flow
feat(invoices): implement draft creation with line items
feat(invoices): implement status transition endpoint
fix(transactions): correct BIGINT conversion on update
chore(db): add index on transactions.transaction_date
```

Commit **per sub-feature** — not per file, and not at the end of a session. A sub-feature is a single complete, testable unit of work (one endpoint, one trigger, one worker).

---

## 11. AI Collaboration Protocol

### The Pause Points

After each sub-feature is complete:

1. **Stop** — do not proceed to the next sub-feature
2. **Review** — manually test the endpoint with curl or Postman
3. **Commit** — use a Conventional Commit message
4. **Continue** — only after the manual check passes

### Module Completion Checklist

Before merging a feature branch:

- [ ] All endpoints manually tested
- [ ] Error cases verified (invalid input, missing auth, forbidden access)
- [ ] Swagger/OpenAPI spec generated and verified for the module
- [ ] No `console.log` left in code — use Pino logger
- [ ] No raw `process.env` reads — use `env` from `lib/env.ts`
- [ ] No decimal arithmetic on monetary values
- [ ] No `try/catch` in controllers — errors thrown from services only

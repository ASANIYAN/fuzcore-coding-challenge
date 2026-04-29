# Technical Design Document

### Small Business Accounting App

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Infrastructure](#infrastructure)
4. [Database Schema](#database-schema)
5. [Triggers](#triggers)
6. [Concurrency & Locking](#concurrency--locking)
7. [Security](#security)
8. [Logging](#logging)
9. [API Design](#api-design)
10. [REST API Endpoints](#rest-api-endpoints)
11. [Background Jobs](#background-jobs)
12. [Invoice Lifecycle](#invoice-lifecycle)

---

## Overview

A full-stack accounting app for small business owners to manage customers, record transactions, and issue invoices. Built with React, TypeScript, Express, PostgreSQL, Drizzle ORM, and BullMQ.

---

## Architecture Decisions

### Authentication

- **HTTP-only cookie sessions** stored in PostgreSQL. Chosen for simplicity, instant session revocation, XSS prevention, and suitability for a monolithic full-stack app. A single user may hold multiple active sessions simultaneously (e.g. phone and laptop).
- **OTP verification** via email for both email verification and password reset. HMAC-SHA256 is used to hash OTPs before storage. Fast hashing is acceptable here because OTPs are short-lived, single-use, and protected by rate limiting. The HMAC secret key lives in environment variables and never touches the codebase.
- **Zod** validates all environment variables at startup before the server begins listening, ensuring missing or malformed config fails loudly and early rather than at runtime.

### Schema Principles

- **Nullish timestamps over booleans** wherever a timestamp is analytically richer (e.g. `archived_at`, `used_at`, `paid_at`, `sent_at`, `voided_at`).
- **Soft deletes** via `archived_at` on customers, categories, and transactions. Hard deletes are avoided to preserve audit history and referential integrity on historical records.
- **UUIDs** as primary keys across all tables for unguessability and distributed-safe ID generation.

### Money Handling

- **BIGINT** for all monetary amounts, stored in the smallest currency unit (e.g. cents, kobo, pence). Conversion to and from human-readable decimals happens exclusively at the application boundary — never inside the database. This eliminates floating point precision errors caused by base-2 representation of base-10 decimals.
- **Currency** is defined as a single `SUPPORTED_CURRENCIES` array in `lib/currency.ts`. This array is the single source of truth for valid currency codes, scale multipliers, names, and symbols. The Drizzle CHECK constraint and Zod validation schema are both derived from this array — adding a new currency means adding one entry to the array and running a migration.
- Currencies with non-standard scales: **JPY** (scale 1, no minor unit), **KWD** (scale 1000, three decimal places). All others use scale 100.
- The 20 supported currencies span Africa (NGN, GHS, KES, ZAR, EGP), UK/US (GBP, USD), Europe (EUR, CHF, SEK, NOK), Asia Pacific (JPY, CNY, INR, AUD, SGD, AED, KWD), and Americas (CAD, BRL).

### Derived Values

- Invoice totals and line item subtotals are **never stored**. They are always computed at query time from line item quantities and unit prices. Storing them risks inconsistency if line items are edited without recalculating.

### Invoice State Machine

- Status transitions are enforced at the **database level** via a `BEFORE UPDATE` trigger. Application-level validation alone is insufficient — the database is the last line of defence regardless of what the application layer does.
- Valid transitions:
  ```
  draft  → sent
  draft  → void
  sent   → paid
  sent   → void
  paid   → (terminal)
  void   → (terminal)
  ```
- Every status change stamps the corresponding timestamp (`sent_at`, `paid_at`, `voided_at`) in the same database operation. Status enum and timestamps are kept in sync — never one without the other.
- Payment links are only generated for `sent` invoices. The state machine already protects link amount consistency — once sent, an invoice cannot return to draft where amounts could be edited.

### Concurrency & Locking

- **Pessimistic locking** (`SELECT FOR UPDATE`) is used for any operation that involves a read-modify-write sequence on a shared row. Locks are acquired inside a transaction and released on commit.
- **Status re-check inside the lock** is mandatory — application-level pre-checks are fast-path optimisations only. The authoritative check always happens after the lock is acquired to guard against stale reads from concurrent requests.
- **CSV imports** are serialised per user via the `import_jobs` table — a new job is rejected with `409 Conflict` if the user already has a `pending` or `processing` job. This replaces Redis-based locking and makes job state queryable, auditable, and durable.

### Webhook Idempotency

- Stripe may deliver the same webhook event more than once. Three layers protect against duplicate processing: a `processed_webhook_events` lookup (earliest exit), pessimistic row lock with status re-check (concurrency guard), and the DB state machine trigger (last line of defence).
- Stripe `event.id` is stored in `processed_webhook_events` after successful processing. Any duplicate delivery is rejected at the first layer before any invoice logic runs.
- A transaction typed `income` must not link to a category typed `expense` and vice versa. Enforced via a `BEFORE INSERT OR UPDATE` trigger on `transactions` that cross-queries the `categories` table. A CHECK constraint cannot enforce this as it is row-scoped and cannot perform cross-table lookups.

### Transaction Type Inference

- `transactions.type` is **never accepted from any client payload** — not the create endpoint, not the update endpoint, not the CSV import. It is always inferred from `categories.type` by the service layer after resolving `category_id`.
- This makes the category the single source of truth for transaction type. The `type` column is retained on `transactions` as a deliberate denormalisation for query performance — filtering and aggregating by type without a join to `categories` is significantly faster at scale.
- The DB trigger enforces consistency as the last line of defence. Zod schemas explicitly omit `type` from all transaction request shapes so it cannot be passed in accidentally.

### Category Reference Format

- In the CSV import flow, categories are identified by a human-readable reference string in the format `type:name` — e.g. `income:Consulting`, `expense:Office Supplies`. This is unambiguous because the `UNIQUE (user_id, name, type)` constraint guarantees no two active categories share the same name and type combination per user.
- Customers are identified in CSV by `customerEmail` — unambiguous due to the `UNIQUE (user_id, email)` constraint. Nullable since expense transactions do not require a customer.
- The worker resolves both references to their respective UUIDs before writing. Unresolvable references are reported as row-level errors with a clear human-readable message.
- **Drizzle ORM** with **drizzle-zod** for type-safe database access. Drizzle-zod automatically generates Zod validation schemas from Drizzle table definitions, keeping DB schema and validation schema in sync and eliminating duplication.
- **drizzle-kit** for migration management. Schema changes generate versioned SQL migration files. Migrations run on container startup before the server begins listening.

---

## Infrastructure

| Component     | Technology        | Purpose                  |
| ------------- | ----------------- | ------------------------ |
| Database      | PostgreSQL        | Primary data store       |
| Cache / Queue | Redis             | BullMQ job queue backend |
| ORM           | Drizzle ORM       | Type-safe DB access      |
| Job Queue     | BullMQ            | Background email jobs    |
| Email         | Resend / Sendgrid | Email delivery           |
| Payments      | Stripe            | Payment link generation  |
| PDF           | (library TBD)     | Invoice PDF generation   |

---

## Database Schema

### `users`

| Column            | Type        | Constraints                   |
| ----------------- | ----------- | ----------------------------- |
| id                | UUID        | PK, default gen_random_uuid() |
| email             | TEXT        | NOT NULL                      |
| password_hash     | TEXT        | NOT NULL                      |
| email_verified_at | TIMESTAMPTZ | nullable                      |
| created_at        | TIMESTAMPTZ | NOT NULL, default now()       |
| updated_at        | TIMESTAMPTZ | NOT NULL, default now()       |

**Indexes & Constraints**

- `UNIQUE (email)`

---

### `sessions`

| Column         | Type        | Constraints              |
| -------------- | ----------- | ------------------------ |
| id             | UUID        | PK                       |
| user_id        | UUID        | NOT NULL, FK → users(id) |
| created_at     | TIMESTAMPTZ | NOT NULL, default now()  |
| expires_at     | TIMESTAMPTZ | NOT NULL                 |
| last_active_at | TIMESTAMPTZ | NOT NULL                 |
| revoked_at     | TIMESTAMPTZ | nullable                 |

**Indexes & Constraints**

- `INDEX (user_id)` — for revoking all sessions on password reset

---

### `verification_codes`

| Column        | Type        | Constraints                                                 |
| ------------- | ----------- | ----------------------------------------------------------- |
| id            | UUID        | PK, default gen_random_uuid()                               |
| user_id       | UUID        | NOT NULL, FK → users(id)                                    |
| code_hash     | TEXT        | NOT NULL                                                    |
| type          | TEXT        | NOT NULL, CHECK IN ('email_verification', 'password_reset') |
| expires_at    | TIMESTAMPTZ | NOT NULL                                                    |
| used_at       | TIMESTAMPTZ | nullable                                                    |
| superseded_at | TIMESTAMPTZ | nullable                                                    |
| created_at    | TIMESTAMPTZ | NOT NULL, default now()                                     |

**Indexes & Constraints**

- `INDEX (user_id, type)` — OTP lookup always queries both together

**Notes**

- When a new OTP is requested before the previous one expires, `superseded_at` is stamped on the old record rather than deleting it. This preserves the full request history for analytics and audit.
- OTPs expire after 15 minutes and are single-use. `used_at` is stamped on consumption.

---

### `customers`

| Column         | Type        | Constraints                              |
| -------------- | ----------- | ---------------------------------------- |
| id             | UUID        | PK, default gen_random_uuid()            |
| user_id        | UUID        | NOT NULL, FK → users(id)                 |
| display_name   | TEXT        | NOT NULL                                 |
| company_name   | TEXT        | nullable                                 |
| type           | TEXT        | NOT NULL, CHECK IN ('person', 'company') |
| email          | TEXT        | nullable                                 |
| phone          | TEXT        | nullable                                 |
| tax_id         | TEXT        | nullable                                 |
| address_line_1 | TEXT        | nullable                                 |
| address_line_2 | TEXT        | nullable                                 |
| city           | TEXT        | nullable                                 |
| state          | TEXT        | nullable                                 |
| postal_code    | TEXT        | nullable                                 |
| country        | TEXT        | nullable                                 |
| created_at     | TIMESTAMPTZ | NOT NULL, default now()                  |
| updated_at     | TIMESTAMPTZ | NOT NULL, default now()                  |
| archived_at    | TIMESTAMPTZ | nullable                                 |

**Indexes & Constraints**

- `INDEX (user_id)`
- `UNIQUE (user_id, email) WHERE email IS NOT NULL` — email unique per user, not globally. Two business owners may share a customer with the same email.

**Notes**

- Only `display_name` and `type` are required. All contact and address fields are nullable — address completeness is validated at invoice generation time, not at customer creation.
- `tax_id` is nullable as not all jurisdictions require it on invoices. When present on a company customer, it is rendered on the invoice PDF.

---

### `categories`

| Column      | Type        | Constraints                              |
| ----------- | ----------- | ---------------------------------------- |
| id          | UUID        | PK, default gen_random_uuid()            |
| user_id     | UUID        | NOT NULL, FK → users(id)                 |
| name        | TEXT        | NOT NULL                                 |
| type        | TEXT        | NOT NULL, CHECK IN ('income', 'expense') |
| created_at  | TIMESTAMPTZ | NOT NULL, default now()                  |
| updated_at  | TIMESTAMPTZ | NOT NULL, default now()                  |
| archived_at | TIMESTAMPTZ | nullable                                 |

**Indexes & Constraints**

- `INDEX (user_id)`
- `UNIQUE (user_id, name, type)` — no duplicate category names of the same type per user

**Notes**

- `type` cannot be changed after creation to preserve historical integrity of linked transactions.
- When fetching categories for transaction creation, filter by `type` to match the transaction type being created.

---

### `transactions`

| Column           | Type        | Constraints                                           |
| ---------------- | ----------- | ----------------------------------------------------- |
| id               | UUID        | PK, default gen_random_uuid()                         |
| user_id          | UUID        | NOT NULL, FK → users(id)                              |
| customer_id      | UUID        | nullable, FK → customers(id)                          |
| category_id      | UUID        | NOT NULL, FK → categories(id)                         |
| type             | TEXT        | NOT NULL, CHECK IN ('income', 'expense')              |
| amount           | BIGINT      | NOT NULL — stored in smallest currency unit           |
| currency         | TEXT        | NOT NULL, CHECK IN (...ISO 4217 codes)                |
| description      | TEXT        | nullable                                              |
| reference        | TEXT        | nullable — alphanumeric document reference            |
| import_hash      | TEXT        | nullable — used for CSV duplicate detection           |
| transaction_date | TIMESTAMPTZ | NOT NULL — when the transaction actually occurred     |
| created_at       | TIMESTAMPTZ | NOT NULL, default now() — when the record was created |
| updated_at       | TIMESTAMPTZ | NOT NULL, default now()                               |
| archived_at      | TIMESTAMPTZ | nullable                                              |

**Indexes & Constraints**

- `INDEX (user_id)`
- `INDEX (customer_id)`
- `INDEX (category_id)`
- `INDEX (transaction_date)` — date range filtering is frequent in accounting
- `UNIQUE (user_id, import_hash) WHERE import_hash IS NOT NULL` — prevents duplicate CSV imports

**Notes**

- `transaction_date` is manually entered by the user to support backdating. `created_at` is the DB record creation timestamp — these two will frequently differ.
- `customer_id` is nullable — expense transactions do not require a customer.
- `type` is never accepted from client payloads. The service layer reads `categories.type` for the given `category_id` and writes it to `transactions.type`. The DB trigger enforces consistency as the last line of defence.
- Amount is accepted as a decimal at the API boundary, multiplied by currency scale, stored as BIGINT. Reversed on the way out.

---

### `invoices`

| Column         | Type         | Constraints                                                           |
| -------------- | ------------ | --------------------------------------------------------------------- |
| id             | UUID         | PK, default gen_random_uuid()                                         |
| user_id        | UUID         | NOT NULL, FK → users(id)                                              |
| customer_id    | UUID         | NOT NULL, FK → customers(id)                                          |
| invoice_number | INTEGER      | NOT NULL — per-user sequential counter                                |
| status         | TEXT         | NOT NULL, CHECK IN ('draft', 'sent', 'paid', 'void'), default 'draft' |
| currency       | TEXT         | NOT NULL, CHECK IN (...ISO 4217 codes)                                |
| tax_rate       | NUMERIC(5,2) | nullable — applied uniformly across all line items                    |
| issue_date     | TIMESTAMPTZ  | NOT NULL                                                              |
| due_date       | TIMESTAMPTZ  | nullable                                                              |
| notes          | TEXT         | nullable                                                              |
| payment_link   | TEXT         | nullable — populated when status transitions to sent                  |
| sent_at        | TIMESTAMPTZ  | nullable                                                              |
| paid_at        | TIMESTAMPTZ  | nullable                                                              |
| voided_at      | TIMESTAMPTZ  | nullable                                                              |
| created_at     | TIMESTAMPTZ  | NOT NULL, default now()                                               |
| updated_at     | TIMESTAMPTZ  | NOT NULL, default now()                                               |

**Indexes & Constraints**

- `INDEX (user_id)`
- `INDEX (customer_id)`
- `INDEX (status)`
- `UNIQUE (user_id, invoice_number)` — invoice numbers are sequential per user, formatted as INV-0001 at the application layer

**Notes**

- `invoice_number` is generated by incrementing a per-user counter stored on a `user_invoice_counters` table, incremented transactionally on each invoice creation to prevent gaps or duplicates.
- Totals and subtotals are never stored — always computed at query time.
- `payment_link` is populated atomically when the invoice transitions to `sent`.

---

### `invoice_items`

| Column      | Type          | Constraints                                   |
| ----------- | ------------- | --------------------------------------------- |
| id          | UUID          | PK, default gen_random_uuid()                 |
| invoice_id  | UUID          | NOT NULL, FK → invoices(id) ON DELETE CASCADE |
| description | TEXT          | NOT NULL                                      |
| quantity    | NUMERIC(10,2) | NOT NULL                                      |
| unit_price  | BIGINT        | NOT NULL — stored in smallest currency unit   |
| sort_order  | INTEGER       | NOT NULL                                      |
| created_at  | TIMESTAMPTZ   | NOT NULL, default now()                       |
| updated_at  | TIMESTAMPTZ   | NOT NULL, default now()                       |

**Indexes & Constraints**

- `INDEX (invoice_id)` — all queries fetch items by invoice; also supports performant CASCADE delete

---

### `user_invoice_counters`

| Column              | Type    | Constraints         |
| ------------------- | ------- | ------------------- |
| user_id             | UUID    | PK, FK → users(id)  |
| last_invoice_number | INTEGER | NOT NULL, default 0 |

**Notes**

- Incremented transactionally on each invoice creation using `SELECT FOR UPDATE` to prevent race conditions. Ensures per-user sequential invoice numbers with no gaps and no duplicates under concurrent load.
- Lock is scoped per user — concurrent invoice creation by different users does not cause contention.

---

### `processed_webhook_events`

| Column       | Type        | Constraints                   |
| ------------ | ----------- | ----------------------------- |
| id           | UUID        | PK, default gen_random_uuid() |
| event_id     | TEXT        | NOT NULL — Stripe event.id    |
| event_type   | TEXT        | NOT NULL                      |
| processed_at | TIMESTAMPTZ | NOT NULL, default now()       |

**Indexes & Constraints**

- `UNIQUE (event_id)` — prevents duplicate processing at the DB level

**Notes**

- Checked at the very start of webhook processing before any invoice logic. If `event_id` already exists, return 200 immediately — no further processing.
- Inserted after successful invoice transition and email enqueue. Atomic with the invoice update where possible.
- Serves as a permanent audit log of all processed Stripe events.

---

### `import_jobs`

| Column         | Type        | Constraints                                                                            |
| -------------- | ----------- | -------------------------------------------------------------------------------------- |
| id             | UUID        | PK, default gen_random_uuid()                                                          |
| user_id        | UUID        | NOT NULL, FK → users(id)                                                               |
| status         | TEXT        | NOT NULL, CHECK IN ('pending', 'processing', 'completed', 'failed'), default 'pending' |
| total_rows     | INTEGER     | nullable — populated when worker begins processing                                     |
| imported_rows  | INTEGER     | nullable — populated on completion                                                     |
| duplicate_rows | INTEGER     | nullable — rows skipped due to import_hash match                                       |
| failed_rows    | INTEGER     | nullable — rows that failed validation                                                 |
| errors         | JSONB       | nullable — array of { row, reason }                                                    |
| started_at     | TIMESTAMPTZ | nullable — stamped when worker picks up the job                                        |
| completed_at   | TIMESTAMPTZ | nullable — stamped on success or failure                                               |
| created_at     | TIMESTAMPTZ | NOT NULL, default now()                                                                |

**Indexes & Constraints**

- `INDEX (user_id)`
- `INDEX (user_id, status)` — used for active job check on new upload requests

**Notes**

- Before enqueuing a new import, check for any existing job with `status IN ('pending', 'processing')` for the user. If found, return `409 Conflict` — this serialises imports per user without Redis locks.
- `completed_at` being non-null signals the user is free to upload again. The polling endpoint reads directly from this table — not from BullMQ — making results durable regardless of BullMQ job retention settings.
- Results persist in this table permanently for audit and user reference.

---

## Triggers

### 1. Invoice State Machine — `invoices`

**Event:** `BEFORE UPDATE ON invoices`

Compares `OLD.status → NEW.status` against the permitted transition set. Raises an exception for any transition outside the allowed set. Ensures invalid transitions cannot persist regardless of application layer behaviour.

```
Permitted transitions:
  draft → sent
  draft → void
  sent  → paid
  sent  → void

Terminal states (no transitions out):
  paid
  void
```

---

### 2. Category-Transaction Type Consistency — `transactions`

**Event:** `BEFORE INSERT OR UPDATE ON transactions`

Fetches `type` from `categories` for the given `category_id`. Raises an exception if `categories.type` does not match `transactions.type`. A CHECK constraint cannot enforce this as it cannot perform cross-table lookups.

## Concurrency & Locking

### Locking Strategy by Scenario

| Scenario                     | Strategy                                                            | Reason                                                           |
| ---------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Invoice status transition    | `SELECT FOR UPDATE` on invoice row                                  | Single row, must be synchronous, prevents concurrent transitions |
| Invoice number increment     | `SELECT FOR UPDATE` on counter row                                  | Atomic read-modify-write, scoped per user                        |
| Webhook payment confirmation | `processed_webhook_events` check + `SELECT FOR UPDATE` + DB trigger | Three layers — Stripe can retry concurrently                     |
| CSV import serialisation     | `import_jobs` status check — reject with 409 if active job exists   | DB-native, auditable, replaces Redis lock entirely               |

---

### Invoice Status Transition — Locked Flow

All status transitions, whether triggered by the user or a webhook, go through the same locked flow:

```
1. Begin transaction
2. SELECT * FROM invoices WHERE id = ? AND user_id = ? FOR UPDATE
   → Blocks any concurrent mutation on this row
3. Re-check current status inside lock (authoritative check)
4. If already in target state → release lock, return early (idempotent)
5. If transition invalid → release lock, throw InvalidTransitionError
6. Apply transition, stamp corresponding timestamp
7. Commit → lock released
```

---

### Invoice Counter — Locked Increment

```
1. Begin transaction
2. SELECT last_invoice_number FROM user_invoice_counters
   WHERE user_id = ? FOR UPDATE
   → Blocks concurrent increments for this user only
3. Increment value
4. UPDATE user_invoice_counters SET last_invoice_number = ?
5. INSERT invoice with new invoice_number
6. Commit → lock released
```

---

### Webhook — Full Idempotency Flow

```
1. Verify Stripe signature → reject with 400 if invalid
2. Return 200 to Stripe immediately
3. Check processed_webhook_events for event.id
   → If found: already processed, return early
4. Begin transaction
5. SELECT * FROM invoices WHERE id = ? FOR UPDATE
6. Re-check status is still 'sent' inside lock
   → If not: duplicate or race condition, return early
7. Transition to paid, stamp paid_at
8. Insert event.id into processed_webhook_events
9. Commit
10. Enqueue owner notification email (after commit)
```

---

## Security

### CORS

- Whitelist only the frontend origin explicitly — never wildcard `*` in production
- Credentials permitted (`withCredentials: true`) since sessions use HTTP-only cookies
- Allowed methods: `GET, POST, PATCH, DELETE`
- Allowed headers: `Content-Type`

### HTTP Security Headers — Helmet.js

Applied as the first middleware in the Express chain:

| Header                            | Purpose                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| `Content-Security-Policy`         | Restricts external script and asset sources, mitigates XSS |
| `Strict-Transport-Security`       | Forces HTTPS, prevents protocol downgrade attacks          |
| `X-Frame-Options: DENY`           | Prevents iframe embedding, blocks clickjacking             |
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing                                |
| `Referrer-Policy: no-referrer`    | Prevents URL leakage in referrer headers                   |

### Rate Limiting

| Tier     | Endpoints                                                                               | Limit                        |
| -------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| Strict   | All `/auth/*` endpoints                                                                 | 5 requests / IP / 15 minutes |
| Moderate | `POST /transactions/import`, `GET /invoices/:id/pdf`, `POST /invoices/:id/payment-link` | 20 requests / user / hour    |
| Standard | All other authenticated endpoints                                                       | 100 requests / user / minute |

### Additional Measures

- Parameterised queries everywhere via Drizzle ORM — user input is never string-interpolated into SQL
- Webhook endpoint verifies Stripe signature before any processing — unsigned requests rejected immediately with 400
- Input sanitisation applied after Zod validation — string fields trimmed, HTML-renderable fields (notes, descriptions) sanitised server-side
- Auth endpoints never log request bodies — passwords and OTPs never appear in logs

---

## Logging

**Library:** Pino — structured JSON logging, minimal overhead, Node.js native.

Every log entry:

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "requestId": "uuid",
  "userId": "uuid",
  "method": "POST",
  "path": "/invoices",
  "statusCode": 201,
  "responseTime": 45,
  "message": "Invoice created"
}
```

A `requestId` UUID is generated per request via middleware and attached to every log entry, enabling full request tracing across log entries.

**What gets logged:**

- Every inbound request and outbound response — method, path, status code, response time
- Auth events — signup, login, logout, failed attempts, password resets
- Invoice lifecycle transitions — who, what, when
- Email queue — job enqueued, succeeded, failed, retry attempts
- Webhook events — received, signature verified, processed
- Unhandled errors — full stack trace with request context
- Startup — env validation passed, DB connected, Redis connected, server listening

**What never gets logged:**

- Passwords or password hashes
- Session IDs or OTP codes
- Full request bodies on auth endpoints
- Payment provider secrets or webhook signing keys

---

## API Design

### Request Validation

```
Request → Zod (shape + type) → Sanitise (string cleaning) → Service → DB
```

Drizzle-zod generates base schemas from table definitions. Request schemas extend these with endpoint-specific rules (required fields, custom refinements).

### Success Response Envelope

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Paginated list responses populate `meta`:

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

### Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": []
  }
}
```

`details` contains field-level errors on validation failures, empty array otherwise.

### Standard Error Codes

| Code               | HTTP Status | When                                            |
| ------------------ | ----------- | ----------------------------------------------- |
| `VALIDATION_ERROR` | 400         | Invalid request shape or field values           |
| `UNAUTHORIZED`     | 401         | No valid session                                |
| `FORBIDDEN`        | 403         | Valid session but insufficient access           |
| `NOT_FOUND`        | 404         | Resource does not exist or is not owned by user |
| `CONFLICT`         | 409         | Duplicate (email on signup, category name etc)  |
| `INTERNAL_ERROR`   | 500         | Unhandled server error                          |

### Pagination

- **Strategy:** Offset-based — simple, sufficient for this scale
- **Default page size:** 20 records
- **Maximum page size:** 100 records — requests above this return `VALIDATION_ERROR`
- **Query params:** `?page=1&limit=20`

### Money in Responses

All monetary values are returned as BIGINT with their currency code. Conversion to decimal happens at the frontend display layer.

---

## REST API Endpoints

> All endpoints except `/auth/*` and `/webhooks/*` require a valid session cookie.
> All list endpoints support `?page=` and `?limit=` pagination unless noted.

---

### Auth — `/auth`

| Method | Endpoint                | Action                                                                                                                                                                                                     |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/signup`          | Register a new user. Accepts `email` and `password`. Hashes password, creates user record, sends `email_verification` OTP.                                                                                 |
| POST   | `/auth/verify-email`    | Accepts `email` and `code`. Validates OTP against `code_hash`, checks `used_at` is null, `superseded_at` is null, and `expires_at` is in future. Stamps `email_verified_at` on user and `used_at` on code. |
| POST   | `/auth/login`           | Accepts `email` and `password`. Validates credentials, checks `email_verified_at` is not null. Creates session record, sets HTTP-only session cookie.                                                      |
| POST   | `/auth/logout`          | Stamps `revoked_at` on current session. Clears session cookie.                                                                                                                                             |
| POST   | `/auth/forgot-password` | Accepts `email`. Stamps `superseded_at` on any existing unused `password_reset` codes. Generates and sends new OTP.                                                                                        |
| POST   | `/auth/reset-password`  | Accepts `email`, `code`, and `new_password`. Validates OTP, updates `password_hash`, stamps `used_at` on code, revokes all active sessions for the user.                                                   |

---

### Customers — `/customers`

| Method | Endpoint         | Action                                                                                                                      |
| ------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/customers`     | Returns paginated list of active (non-archived) customers scoped to authenticated user, ordered by `created_at` descending. |
| GET    | `/customers/:id` | Returns a single customer by ID. Returns 404 if not found or not owned by authenticated user.                               |
| POST   | `/customers`     | Creates a new customer. Requires `display_name` and `type`. All contact and address fields optional.                        |
| PATCH  | `/customers/:id` | Partial update of any customer fields.                                                                                      |
| DELETE | `/customers/:id` | Soft delete — stamps `archived_at`. Record retained for historical invoice and transaction references.                      |

**Query Parameters**

- `?search=` — filter by `display_name` or `email` (partial match)
- `?type=person|company`

---

### Categories — `/categories`

| Method | Endpoint          | Action                                                                                                      |
| ------ | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| GET    | `/categories`     | Returns all active categories scoped to authenticated user. Not paginated — total count expected to be low. |
| GET    | `/categories/:id` | Returns a single category scoped to authenticated user.                                                     |
| POST   | `/categories`     | Creates a new category. Requires `name` and `type`.                                                         |
| PATCH  | `/categories/:id` | Updates category `name` only. `type` cannot be changed after creation.                                      |
| DELETE | `/categories/:id` | Soft delete — stamps `archived_at`.                                                                         |

**Query Parameters**

- `?type=income|expense` — used when populating category dropdown during transaction creation

---

### Transactions — `/transactions`

| Method | Endpoint            | Action                                                                                                                                                                          |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/transactions`     | Returns paginated list of active transactions scoped to authenticated user, ordered by `transaction_date` descending.                                                           |
| POST   | `/transactions`     | Creates a new transaction. `type` is never accepted — inferred from `categories.type` for the given `category_id`. Amount accepted as decimal, converted to BIGINT at boundary. |
| PATCH  | `/transactions/:id` | Partial update. `type` cannot be updated directly — change `category_id` to a different category type to change the transaction type. Amount conversion applies on update.      |
| DELETE | `/transactions/:id` | Soft delete — stamps `archived_at`.                                                                                                                                             |

**Query Parameters**

- `?type=income|expense`
- `?category_id=uuid`
- `?customer_id=uuid`
- `?from=date&to=date` — filters by `transaction_date` range

---

### Invoices — `/invoices`

| Method | Endpoint               | Action                                                                                                                                                                                                                                                                                                                                             |
| ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/invoices`            | Returns paginated list of invoices scoped to authenticated user, ordered by `created_at` descending.                                                                                                                                                                                                                                               |
| GET    | `/invoices/:id`        | Returns invoice with all line items. Totals and subtotals computed at query time — never stored.                                                                                                                                                                                                                                                   |
| POST   | `/invoices`            | Creates invoice and all line items atomically in a single DB transaction — succeeds or rolls back entirely. Assigns next sequential `invoice_number`. Invoice starts as `draft`.                                                                                                                                                                   |
| PATCH  | `/invoices/:id`        | Updates invoice header fields (notes, due date, tax rate etc). Only permitted when status is `draft`.                                                                                                                                                                                                                                              |
| POST   | `/invoices/:id/status` | Transitions invoice status. Accepts `status` in body. DB trigger validates transition. When transitioning to `sent`: Stripe payment link created first, then DB updated atomically (status + sent_at + payment_link URL), then email job enqueued after commit. If Stripe call fails, DB is never touched and the operation can be safely retried. |

**Query Parameters**

- `?status=draft|sent|paid|void`
- `?customer_id=uuid`
- `?from=date&to=date` — filters by `issue_date` range

---

### Dashboard — `/dashboard`

| Method | Endpoint     | Action                                                                                                       |
| ------ | ------------ | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/dashboard` | Returns aggregated financial summary scoped to authenticated user. Default period is current calendar month. |

**Response shape:**

```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2024-01-01T00:00:00.000Z",
      "to": "2024-01-31T23:59:59.000Z"
    },
    "revenue": { "amount": 500000, "currency": "USD" },
    "expenses": { "amount": 150000, "currency": "USD" },
    "net": { "amount": 350000, "currency": "USD" },
    "outstanding": { "amount": 200000, "currency": "USD", "invoiceCount": 5 },
    "overdue": { "amount": 75000, "currency": "USD", "invoiceCount": 2 },
    "recentTransactions": [],
    "recentInvoices": []
  }
}
```

- `outstanding` — `sent` invoices where `due_date` is in the future
- `overdue` — `sent` invoices where `due_date` has passed
- `recentTransactions` and `recentInvoices` — last 5 of each, saves the frontend an extra round trip
- Multi-currency users receive amounts grouped by currency

**Query Parameters**

- `?from=date&to=date` — override default period

---

### Webhooks — `/webhooks`

| Method | Endpoint           | Action                                                                                                                                                                                                                                                                                                                                     |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/webhooks/stripe` | Publicly accessible — no session auth. Requires raw unparsed body for signature verification — registered before the global JSON parser. Verifies Stripe webhook signature before any processing. Responds 200 immediately to Stripe, then processes the event asynchronously. Invalid or unsigned requests rejected immediately with 400. |

**Stripe Events Handled**

| Event                           | Action                                                                                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout.session.completed`    | Primary success event. Looks up invoice via `invoiceId` stored in session metadata. Checks invoice is still `sent` (idempotency guard). Transitions to `paid`, stamps `paid_at`. Enqueues payment confirmation email to business owner. |
| `checkout.session.expired`      | Session window elapsed without payment. Invoice remains `sent`. Logged for observability.                                                                                                                                               |
| `payment_intent.payment_failed` | Underlying payment attempt failed. Invoice remains `sent` — session may still allow retry. Logged for observability.                                                                                                                    |

**Notes**

- `invoiceId` is stored in Checkout Session metadata at payment link creation time — this is how the webhook identifies which invoice to update.
- Respond to Stripe **before** processing — Stripe expects a 200 within 30 seconds. Heavy processing after that window causes spurious retries.
- Idempotency — if `checkout.session.completed` is delivered more than once, the invoice status check (`sent` guard) prevents a double transition. The DB trigger is a secondary safeguard.

---

### Currencies — `/currencies`

| Method | Endpoint      | Action                                                                                                                                        |
| ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/currencies` | Returns the full list of supported currencies. No auth required — static reference data. Used by the frontend to populate currency dropdowns. |

**Response shape:**

```json
{
  "success": true,
  "data": [
    { "code": "NGN", "name": "Nigerian Naira", "symbol": "₦" },
    { "code": "USD", "name": "US Dollar", "symbol": "$" }
  ]
}
```

**Notes**

- `scale` is intentionally excluded — it is an internal implementation detail the frontend does not need.
- Response is derived directly from `SUPPORTED_CURRENCIES` array — adding a currency to the array is automatically reflected here with no additional changes.

---

### Stretch Goal Endpoints

| Method | Endpoint                      | Action                                                                                                                                                                                                                                                                                        |
| ------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/invoices/:id/pdf`           | Generates and returns a downloadable PDF containing: business owner details, customer details, invoice number, issue and due dates, line items table, subtotal, tax rate, tax amount, total, notes, payment link if present, PAID/VOID status watermark if applicable.                        |
| GET    | `/transactions/import/sample` | No auth required. Returns a downloadable sample `.csv` file with correct headers and two example rows — one income, one expense. Response headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="transactions-sample.csv"`.                                           |
| POST   | `/transactions/import`        | Accepts `multipart/form-data` CSV file upload. Validates file is `.csv` and within size limit. Checks for active import job for user — returns `409 Conflict` if one exists. Creates `import_jobs` record, enqueues BullMQ job, returns `202 Accepted` with `jobId`. Does not process inline. |
| GET    | `/transactions/import/:jobId` | Polls import job status from `import_jobs` table. Returns current status and full results summary on completion.                                                                                                                                                                              |
| POST   | `/invoices/:id/payment-link`  | Generates a Stripe payment link for the invoice total. Only permitted for `sent` invoices. Stores link on invoice record and returns it.                                                                                                                                                      |

**CSV Format**

`type` is not a column — it is inferred from the `category` reference. `category` uses the format `type:name` (e.g. `income:Consulting`, `expense:Office Supplies`). Customer is identified by email, not UUID.

```csv
category,amount,currency,customerEmail,description,reference,transactionDate
income:Consulting,1500.00,NGN,,Consulting fee for March,INV-0001,2024-01-15
expense:Office Supplies,250.00,USD,,Office supplies purchase,REC-0042,2024-01-16
income:Retainer,800.00,GBP,client@acme.com,Monthly retainer fee,INV-0002,2024-01-17
```

**CSV Column Rules**

| Column            | Required | Format       | Notes                                                                                        |
| ----------------- | -------- | ------------ | -------------------------------------------------------------------------------------------- |
| `category`        | Yes      | `type:name`  | Must match an active category for the user. Type extracted from prefix.                      |
| `amount`          | Yes      | Decimal      | e.g. `1500.00`. Converted to BIGINT in worker.                                               |
| `currency`        | Yes      | ISO 4217     | Must be in supported currencies list.                                                        |
| `customerEmail`   | No       | Email        | Must match an active customer for the user. Nullable — leave empty for expense transactions. |
| `description`     | No       | Text         | Free text context for the transaction.                                                       |
| `reference`       | No       | Alphanumeric | Document reference e.g. receipt or invoice number.                                           |
| `transactionDate` | Yes      | ISO 8601     | `YYYY-MM-DD` or full datetime.                                                               |

**CSV Import — 202 Response:**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "message": "Transaction import queued."
  }
}
```

**CSV Import — Poll Response (completed):**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "completed",
    "totalRows": 100,
    "importedRows": 85,
    "duplicateRows": 5,
    "failedRows": 10,
    "errors": [
      { "row": 4, "reason": "Category 'expense:Travel' not found" },
      { "row": 17, "reason": "Missing transactionDate" },
      { "row": 23, "reason": "Customer email 'unknown@test.com' not found" }
    ],
    "startedAt": "2024-01-15T10:30:00.000Z",
    "completedAt": "2024-01-15T10:30:04.000Z"
  }
}
```

**409 Conflict — active import in progress:**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "An import is already in progress. Please wait for it to complete before uploading another file.",
    "details": []
  }
}
```

---

## Background Jobs

### Email Queue — BullMQ + Redis

Email sending is an internal side effect, not an endpoint. Triggered by application logic in two places:

- Invoice transitions to `sent` — email customer with invoice summary and payment link
- Stripe webhook confirms payment — email business owner with payment confirmation

Email jobs are enqueued **only after a successful DB commit** — never inside a transaction.

**Retry strategy:** exponential backoff with jitter on failure. Max retry attempts configured per job type. On max retries exceeded, job moves to the failed queue and is logged with full context for manual review.

**Flow:**

```
Triggering event (status transition / webhook)
        ↓
Job enqueued in BullMQ with payload (invoice_id, event_type)
        ↓
Worker fetches invoice + customer details from DB
        ↓
Formats and dispatches email via provider
        ↓
On failure → exponential backoff + jitter → retry
On max retries → log + alert
```

---

### CSV Import Queue — BullMQ + Redis

CSV imports are processed asynchronously via BullMQ to avoid HTTP timeout on large files. Per-user serialisation is enforced via the `import_jobs` table rather than Redis locks.

**Retry strategy:** 5 attempts with exponential backoff and jitter. On max retries exceeded, `import_jobs` status is set to `failed` with error context.

**Flow:**

```
POST /transactions/import
  → Validate file is .csv and within size limit
  → Check import_jobs for active job (status pending/processing)
     → 409 Conflict if found
  → Create import_jobs record (status: pending)
  → Enqueue BullMQ job with jobId and raw file buffer
  → Return 202 Accepted with jobId

Worker picks up job
  → Stamp import_jobs started_at, set status to processing
  → Parse CSV into row objects
  → Validate all rows upfront — collect per-row errors
  → Bulk resolve category references (type:name → category_id + type)
     → Error if category not found or archived
  → Bulk resolve customerEmail references (email → customer_id)
     → Error if customer not found or archived
  → Set transactions.type from resolved category.type (never from payload)
  → Generate import_hash per valid row, filter out duplicates
  → Batch insert all valid rows in a single statement
  → Update import_jobs: status completed, stamp completed_at,
     total_rows, imported_rows, duplicate_rows, failed_rows, errors

GET /transactions/import/:jobId
  → Read from import_jobs table (not BullMQ)
  → Returns status and full results summary
  → completed_at being non-null signals user is free to upload again
```

**Import hash** — each valid row is hashed from `amount + currency + transactionDate + description + reference` before insert. Existing transactions are checked for matching hashes. Duplicates are skipped and counted separately in the results — not treated as failures.

**Batch validation approach** — all rows are validated upfront before any writes begin. Category and customer ownership is verified in two bulk queries (one per reference type) rather than per-row queries. This reduces DB round trips from N to ~4 regardless of file size.

---

## Invoice Lifecycle — Happy Path

```
1. Customer record exists (prerequisite)
        ↓
2. Owner creates invoice → status: draft
   - Selects customer, sets dates, adds line items, optional tax + notes
   - Counter row locked (SELECT FOR UPDATE), incremented, invoice_number assigned
   - Invoice + line items + counter update committed atomically
        ↓
3. Owner reviews and edits freely while in draft
        ↓
4. Owner transitions to sent
   Step 1 → Create Stripe payment link
            (if this fails: stop — DB untouched, safe to retry)
   Step 2 → Begin DB transaction
            - Lock invoice row (SELECT FOR UPDATE)
            - Re-check status is still draft
            - Set status to sent, stamp sent_at, store payment_link URL
            - Commit
   Step 3 → Enqueue email job (only after successful commit)
            → Customer receives invoice + payment link
        ↓
5. Customer clicks payment link → completes payment via Stripe
        ↓
6. Stripe fires checkout.session.completed webhook
   - Signature verified
   - 200 returned to Stripe immediately
   - Check processed_webhook_events for event.id → exit early if found
   - Begin transaction, lock invoice row (SELECT FOR UPDATE)
   - Re-check status is still sent inside lock
   - Transition to paid, stamp paid_at
   - Insert event.id into processed_webhook_events
   - Commit
   - Enqueue owner notification email (after commit)
        ↓
7. Terminal state: paid
```

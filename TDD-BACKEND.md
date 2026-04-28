# Technical Design Document

### Small Business Accounting App

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Infrastructure](#infrastructure)
4. [Database Schema](#database-schema)
5. [Triggers](#triggers)
6. [Security](#security)
7. [Logging](#logging)
8. [API Design](#api-design)
9. [REST API Endpoints](#rest-api-endpoints)
10. [Background Jobs](#background-jobs)
11. [Invoice Lifecycle](#invoice-lifecycle)

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
- **Currency** stored as a string column constrained via CHECK constraint to valid ISO 4217 codes. Additionally validated at the Zod layer before reaching the database.
- The scale multiplier (100 for most currencies, 1000 for KWD etc) is applied in a shared currency service used consistently across all boundary conversions.

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

### Category-Transaction Type Consistency

- A transaction typed `income` must not link to a category typed `expense` and vice versa. Enforced via a `BEFORE INSERT OR UPDATE` trigger on `transactions` that cross-queries the `categories` table. A CHECK constraint cannot enforce this as it is row-scoped and cannot perform cross-table lookups.

### ORM and Migrations

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

- Incremented transactionally on each invoice creation. Ensures per-user sequential invoice numbers with no gaps and no race conditions.

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

| Method | Endpoint            | Action                                                                                                                                                      |
| ------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/transactions`     | Returns paginated list of active transactions scoped to authenticated user, ordered by `transaction_date` descending.                                       |
| POST   | `/transactions`     | Creates a new transaction. Amount accepted as decimal, converted to BIGINT at boundary. Category type must match transaction type — enforced by DB trigger. |
| PATCH  | `/transactions/:id` | Partial update. Amount conversion applies on update. Category type consistency re-validated by trigger.                                                     |
| DELETE | `/transactions/:id` | Soft delete — stamps `archived_at`.                                                                                                                         |

**Query Parameters**

- `?type=income|expense`
- `?category_id=uuid`
- `?customer_id=uuid`
- `?from=date&to=date` — filters by `transaction_date` range

---

### Invoices — `/invoices`

| Method | Endpoint               | Action                                                                                                                                                                                         |
| ------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/invoices`            | Returns paginated list of invoices scoped to authenticated user, ordered by `created_at` descending.                                                                                           |
| GET    | `/invoices/:id`        | Returns invoice with all line items. Totals and subtotals computed at query time — never stored.                                                                                               |
| POST   | `/invoices`            | Creates invoice and all line items atomically in a single DB transaction — succeeds or rolls back entirely. Assigns next sequential `invoice_number`. Invoice starts as `draft`.               |
| PATCH  | `/invoices/:id`        | Updates invoice header fields (notes, due date, tax rate etc). Only permitted when status is `draft`.                                                                                          |
| POST   | `/invoices/:id/status` | Transitions invoice status. Accepts `status` in body. DB trigger validates transition. Corresponding timestamp stamped in same operation. Payment link generated when transitioning to `sent`. |

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

| Method | Endpoint           | Action                                                                                                                                                                                                                                                                                                                 |
| ------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/webhooks/stripe` | Publicly accessible — no session auth. Verifies Stripe webhook signature before any processing. On payment success: looks up invoice by payment reference, transitions to `paid`, stamps `paid_at`, enqueues payment confirmation email to business owner. Invalid or unsigned requests rejected immediately with 400. |

---

### Stretch Goal Endpoints

| Method | Endpoint                     | Action                                                                                                                                                                                                                                                                 |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/invoices/:id/pdf`          | Generates and returns a downloadable PDF containing: business owner details, customer details, invoice number, issue and due dates, line items table, subtotal, tax rate, tax amount, total, notes, payment link if present, PAID/VOID status watermark if applicable. |
| POST   | `/transactions/import`       | Accepts CSV file upload. Parses and validates each row. Valid rows bulk inserted. Invalid rows reported with row number and reason. Duplicate detection via `import_hash` (hash of amount + currency + transaction_date + description + reference).                    |
| POST   | `/invoices/:id/payment-link` | Generates a Stripe payment link for the invoice total. Only permitted for `sent` invoices. Stores link on invoice record and returns it.                                                                                                                               |

**CSV Import Response:**

```json
{
  "success": true,
  "data": {
    "imported": 90,
    "failed": 10,
    "errors": [
      { "row": 4, "reason": "Invalid currency code" },
      { "row": 17, "reason": "Missing transaction_date" }
    ]
  }
}
```

---

## Background Jobs

### Email Queue — BullMQ + Redis

Email sending is an internal side effect, not an endpoint. Triggered by application logic in two places:

- Invoice transitions to `sent` — email customer with invoice summary and payment link
- Stripe webhook confirms payment — email business owner with payment confirmation

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

## Invoice Lifecycle — Happy Path

```
1. Customer record exists (prerequisite)
        ↓
2. Owner creates invoice → status: draft
   - Selects customer, sets dates, adds line items, optional tax + notes
   - Invoice number assigned (INV-0001)
        ↓
3. Owner reviews and edits freely while in draft
        ↓
4. Owner transitions to sent
   - sent_at stamped
   - Invoice locked — no further edits to amounts or line items
   - Payment link generated and stored on invoice
   - Email job enqueued → customer receives invoice + payment link
        ↓
5. Customer clicks payment link → completes payment via Stripe
        ↓
6. Stripe fires webhook → signature verified
   - Invoice transitioned to paid, paid_at stamped
   - Owner notification email enqueued
        ↓
7. Terminal state: paid
```

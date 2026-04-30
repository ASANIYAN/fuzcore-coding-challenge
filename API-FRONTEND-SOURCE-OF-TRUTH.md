# API Frontend Source of Truth

This document is the implementation-ready API reference for frontend work.
It is derived from current backend Swagger/OpenAPI and runtime response behavior.

## Base
- Base path: `/api`
- Auth mechanism: server session cookie (`sid`) via `Set-Cookie`
- Protected endpoints require credentials (frontend should send cookies)

## Global Response Contracts

### Success (non-paginated)
```json
{
  "success": true,
  "data": { }
}
```

### Success (paginated)
```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### Error (generic)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "path": ["fieldName"],
        "message": "Field is required"
      }
    ]
  }
}
```

### Common Error Codes
- `BAD_REQUEST` (400)
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

---

## Auth Features

### `POST /api/auth/signup`
- Auth: Public
- Payload:
```json
{ "email": "owner@example.com", "password": "supersecure123" }
```
- Success: `201`, sets session cookie, returns message
- Errors: `400`, `409`, `429`
- UX:
  - On success, user is logged in immediately (cookie set)
  - Show "check your email" flow for OTP verification

### `POST /api/auth/verify-email`
- Auth: Public
- Payload:
```json
{ "email": "owner@example.com", "code": "123456" }
```
- Success: `200`
- Errors: `400`, `429`
- UX:
  - Form with code input, resend option, clear validation display

### `POST /api/auth/login`
- Auth: Public
- Payload:
```json
{ "email": "owner@example.com", "password": "supersecure123" }
```
- Success: `200`, sets session cookie
- Errors: `400`, `401`, `429`
- UX:
  - Login page should handle invalid credentials and lockout-like retry feedback

### `POST /api/auth/logout`
- Auth: Required
- Payload: none
- Success: `200`, cookie cleared
- Errors: `401`
- UX:
  - Redirect to login and clear local auth state

### `POST /api/auth/forgot-password`
- Auth: Public
- Payload:
```json
{ "email": "owner@example.com" }
```
- Success: `200`
- Errors: `400`, `429`
- UX:
  - Always show neutral message to avoid account enumeration

### `POST /api/auth/reset-password`
- Auth: Public
- Payload:
```json
{ "email": "owner@example.com", "code": "123456", "newPassword": "newsecure123" }
```
- Success: `200`
- Errors: `400`, `429`
- UX:
  - Strong password validation hints + OTP error handling

---

## Currencies Feature

### `GET /api/currencies`
- Auth: Public
- Payload: none
- Query/path params: none
- Success: `200`
```json
{
  "success": true,
  "data": [
    { "code": "USD", "name": "US Dollar", "symbol": "$" },
    { "code": "NGN", "name": "Nigerian Naira", "symbol": "₦" }
  ]
}
```
- UX:
  - Call once at app/bootstrap
  - Use for dropdowns and currency labels
  - No need to hardcode currencies in frontend

---

## Customers Features

### `GET /api/customers`
- Auth: Required
- Query params:
  - `page` (int, default 1)
  - `limit` (int, max 100)
  - `search` (string)
  - `type` (`person|company`)
- Success: `200` paginated list
- UX:
  - Build searchable/paginated table

### `POST /api/customers`
- Auth: Required
- Payload (email required):
```json
{
  "displayName": "Acme Ltd",
  "type": "company",
  "email": "billing@acme.test",
  "companyName": null,
  "phone": null,
  "taxId": null,
  "addressLine1": null,
  "addressLine2": null,
  "city": null,
  "state": null,
  "postalCode": null,
  "country": null
}
```
- Success: `201`
- Errors: `400` (validation/duplicate), others generic
- UX:
  - Inline per-field validation
  - Duplicate email conflicts should map to user-friendly message

### `GET /api/customers/{id}`
- Auth: Required
- Path params: `id` (uuid)
- Success: `200`
- Errors: `404`
- UX:
  - Detail page prefill/edit form data

### `PATCH /api/customers/{id}`
- Auth: Required
- Path params: `id` (uuid)
- Payload: partial of create schema
- Success: `200`
- UX:
  - Partial update; optimistic UI possible

### `DELETE /api/customers/{id}`
- Auth: Required
- Path params: `id` (uuid)
- Success: `200` with message
- UX:
  - Confirm modal and list refresh

---

## Categories Features

### `GET /api/categories`
- Auth: Required
- Query params: `type` (`income|expense`)
- Success: `200`

### `POST /api/categories`
- Auth: Required
- Payload:
```json
{ "name": "Consulting", "type": "income" }
```
- Success: `201`
- Errors: `400` (validation/duplicate)

### `GET /api/categories/{id}`
- Auth: Required
- Success: `200`

### `PATCH /api/categories/{id}`
- Auth: Required
- Payload:
```json
{ "name": "New Name" }
```
- Success: `200`
- Errors: `400` (validation/duplicate)

### `DELETE /api/categories/{id}`
- Auth: Required
- Success: `200`

- UX (all category endpoints):
  - Keep separate Income/Expense tabs
  - Prevent creating duplicates visually before submit where possible

---

## Transactions Features

### `GET /api/transactions`
- Auth: Required
- Query params:
  - `page`, `limit`
  - `type` (`income|expense`)
  - `categoryId` (uuid)
  - `customerId` (uuid)
  - `startDate`, `endDate` (date-time)
- Success: `200` paginated
- UX:
  - Filter panel + paginated table

### `POST /api/transactions`
- Auth: Required
- Payload (`type` is inferred from category):
```json
{
  "customerId": "uuid-or-null",
  "categoryId": "uuid",
  "amount": 1250.5,
  "currency": "USD",
  "description": "Project milestone payment",
  "reference": "INV-2026-0001",
  "transactionDate": "2026-04-29T10:00:00.000Z"
}
```
- Success: `201`
- Errors: `400` validation/business rules
- UX:
  - Do not send `type` from frontend
  - Use category type selection to influence available categories

### `GET /api/transactions/{id}`
- Auth: Required
- Success: `200`

### `PATCH /api/transactions/{id}`
- Auth: Required
- Payload: partial create payload
- Success: `200`
- UX:
  - To change logical type, change `categoryId` to category of desired type

### `DELETE /api/transactions/{id}`
- Auth: Required
- Success: `200` message

### `POST /api/transactions/import`
- Auth: Required
- Content-Type: `multipart/form-data`
- Field: `file` (`.csv`, required)
- Success: `202` with `jobId`
- Errors: `400`, `401`, `409`

### `GET /api/transactions/import/{jobId}`
- Auth: Required
- Success: `200` job status (`pending|processing|completed|failed`)
- Errors: `401`, `404`

### `GET /api/transactions/import/sample`
- Auth: Public
- Success: `200` downloadable CSV

- UX (import flow):
  - Upload CSV -> show queued state -> poll status endpoint until completed/failed
  - Show `errors[]` per row in import result

---

## Invoices Features

### `GET /api/invoices`
- Auth: Required
- Query params:
  - `page`, `limit`
  - `status` (`draft|sent|paid|void`)
  - `customerId`
  - `from`, `to`
- Success: `200` paginated

### `POST /api/invoices`
- Auth: Required
- Payload:
```json
{
  "customerId": "uuid",
  "currency": "USD",
  "taxRate": 7.5,
  "issueDate": "2026-04-29T10:00:00.000Z",
  "dueDate": "2026-05-10T10:00:00.000Z",
  "notes": "Thank you for your business.",
  "items": [
    { "description": "Design services", "quantity": 2, "unitPrice": 500, "sortOrder": 0 }
  ]
}
```
- Success: `201`

### `GET /api/invoices/{id}`
- Auth: Required
- Success: `200`
- Errors: `404`

### `PATCH /api/invoices/{id}`
- Auth: Required
- Payload: partial invoice header + optional full items array
- Success: `200`

### `POST /api/invoices/{id}/status`
- Auth: Required
- Payload:
```json
{ "status": "sent" }
```
- Allowed status updates: `sent|paid|void`
- Success: `200`
- Errors: `400` invalid transition
- UX:
  - Status transition buttons should be context-aware
  - `sent` triggers email dispatch and payment-link provisioning logic

### `POST /api/invoices/{id}/payment-link`
- Auth: Required
- Payload: none
- Success: `200` with `paymentLink`
- Errors: `400`

### `POST /api/invoices/{id}/resend`
- Auth: Required
- Payload: none
- Rate limit: strict moderate (`10/hour`)
- Success: `200` message
- Errors:
  - `403` if invoice is `draft|void|paid` (paid has explicit message)
  - `404` not found
  - `429` too many requests
- UX:
  - Show "Resend" only when status is `sent`
  - Disable button while request is in-flight
  - Surface clear paid-state error when already settled

### `GET /api/invoices/{id}/pdf`
- Auth: Required
- Success: `200` downloadable PDF file
- Errors: `404`
- UX:
  - Trigger direct file download (attachment), no inline renderer required

---

## Dashboard Features

### `GET /api/dashboard`
- Auth: Required
- Query params:
  - `from` (date-time, optional)
  - `to` (date-time, optional)
- Success: `200`
- Data includes:
  - `period`
  - `revenue[]`, `expenses[]`, `net[]`
  - `outstanding[]`, `overdue[]`
  - `recentTransactions[]`, `recentInvoices[]`
- UX:
  - Use to populate top summary cards + recent activity widgets
  - Re-fetch on date range changes

---

## Frontend Implementation Order (Suggested)
1. Auth (signup/login/logout/verify/reset) + cookie credential plumbing
2. Currencies bootstrap (`GET /api/currencies`) and shared dropdown state
3. Customers CRUD
4. Categories CRUD
5. Transactions CRUD + filters
6. Transaction CSV import (upload, polling, error display)
7. Invoices CRUD + status + payment-link + resend + PDF download
8. Dashboard analytics views

---

## Notes for Frontend Reliability
- Always map error `code` + `message` + `details` to UI feedback.
- For forms, consume `details[].path` for field-level errors.
- For protected requests, ensure credentials are included.
- For any endpoint returning downloadable content (`csv`, `pdf`), use blob/file download handling on the client.

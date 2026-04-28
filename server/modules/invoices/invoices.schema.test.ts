import assert from "node:assert/strict";
import test from "node:test";
import {
  createInvoiceSchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "./invoices.schema";

test("createInvoiceSchema accepts valid payload", () => {
  const result = createInvoiceSchema.safeParse({
    customerId: "550e8400-e29b-41d4-a716-446655440000",
    currency: "USD",
    issueDate: new Date().toISOString(),
    items: [
      {
        description: "Consulting",
        quantity: 2,
        unitPrice: 100,
        sortOrder: 0,
      },
    ],
  });
  assert.equal(result.success, true);
});

test("createInvoiceSchema rejects empty items", () => {
  const result = createInvoiceSchema.safeParse({
    customerId: "550e8400-e29b-41d4-a716-446655440000",
    currency: "USD",
    issueDate: new Date().toISOString(),
    items: [],
  });
  assert.equal(result.success, false);
});

test("listInvoicesQuerySchema parses defaults", () => {
  const result = listInvoicesQuerySchema.parse({});
  assert.equal(result.page, 1);
  assert.equal(result.limit, 20);
});

test("updateInvoiceSchema requires at least one field", () => {
  const result = updateInvoiceSchema.safeParse({});
  assert.equal(result.success, false);
});

test("updateInvoiceStatusSchema validates allowed statuses", () => {
  const valid = updateInvoiceStatusSchema.safeParse({ status: "sent" });
  assert.equal(valid.success, true);

  const invalid = updateInvoiceStatusSchema.safeParse({ status: "draft" });
  assert.equal(invalid.success, false);
});

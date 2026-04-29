import assert from "node:assert/strict";
import test from "node:test";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from "./transactions.schema";

test("createTransactionSchema accepts valid payload", () => {
  const result = createTransactionSchema.safeParse({
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
    amount: 99.99,
    currency: "USD",
    transactionDate: new Date().toISOString(),
  });
  assert.equal(result.success, true);
});

test("createTransactionSchema rejects invalid currency", () => {
  const result = createTransactionSchema.safeParse({
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
    amount: 99.99,
    currency: "usd",
    transactionDate: new Date().toISOString(),
  });
  assert.equal(result.success, false);
});

test("listTransactionsQuerySchema parses defaults", () => {
  const result = listTransactionsQuerySchema.parse({});
  assert.equal(result.page, 1);
  assert.equal(result.limit, 20);
});

test("updateTransactionSchema requires at least one field", () => {
  const result = updateTransactionSchema.safeParse({});
  assert.equal(result.success, false);
});

test("transaction schemas reject client-supplied type", () => {
  const createResult = createTransactionSchema.safeParse({
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
    amount: 99.99,
    currency: "USD",
    transactionDate: new Date().toISOString(),
    type: "income",
  });
  assert.equal(createResult.success, false);

  const updateResult = updateTransactionSchema.safeParse({
    type: "expense",
  });
  assert.equal(updateResult.success, false);
});

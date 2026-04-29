import assert from "node:assert/strict";
import test from "node:test";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customers.schema";

test("createCustomerSchema accepts valid payload", () => {
  const result = createCustomerSchema.safeParse({
    displayName: "Jane Smith",
    type: "person",
    email: "jane@example.com",
  });

  assert.equal(result.success, true);
});

test("createCustomerSchema rejects invalid payload", () => {
  const result = createCustomerSchema.safeParse({
    displayName: "",
    type: "invalid",
  });

  assert.equal(result.success, false);
});

test("createCustomerSchema requires email", () => {
  const result = createCustomerSchema.safeParse({
    displayName: "Acme Ltd",
    type: "company",
  });

  assert.equal(result.success, false);
});

test("listCustomersQuerySchema parses pagination defaults", () => {
  const result = listCustomersQuerySchema.parse({});

  assert.equal(result.page, 1);
  assert.equal(result.limit, 20);
});

test("updateCustomerSchema requires at least one field", () => {
  const result = updateCustomerSchema.safeParse({});
  assert.equal(result.success, false);
});

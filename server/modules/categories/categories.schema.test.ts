import assert from "node:assert/strict";
import test from "node:test";
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from "./categories.schema";

test("createCategorySchema accepts valid payload", () => {
  const result = createCategorySchema.safeParse({
    name: "Sales",
    type: "income",
  });
  assert.equal(result.success, true);
});

test("createCategorySchema rejects invalid type", () => {
  const result = createCategorySchema.safeParse({
    name: "Sales",
    type: "invalid",
  });
  assert.equal(result.success, false);
});

test("listCategoriesQuerySchema validates type filter", () => {
  const valid = listCategoriesQuerySchema.safeParse({ type: "expense" });
  assert.equal(valid.success, true);

  const invalid = listCategoriesQuerySchema.safeParse({ type: "unknown" });
  assert.equal(invalid.success, false);
});

test("updateCategorySchema requires non-empty name", () => {
  const result = updateCategorySchema.safeParse({ name: "" });
  assert.equal(result.success, false);
});

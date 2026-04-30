import assert from "node:assert/strict";
import test from "node:test";
import { dashboardQuerySchema } from "./dashboard.schema";

test("dashboardQuerySchema accepts empty query", () => {
  const parsed = dashboardQuerySchema.parse({});
  assert.equal(parsed.from, undefined);
  assert.equal(parsed.to, undefined);
});

test("dashboardQuerySchema parses valid date range", () => {
  const parsed = dashboardQuerySchema.parse({
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-01-31T23:59:59.000Z",
  });

  assert.equal(parsed.from instanceof Date, true);
  assert.equal(parsed.to instanceof Date, true);
});

test("dashboardQuerySchema rejects inverted date range", () => {
  const result = dashboardQuerySchema.safeParse({
    from: "2026-02-01T00:00:00.000Z",
    to: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(result.success, false);
});

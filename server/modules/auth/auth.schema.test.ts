import assert from "node:assert/strict";
import test from "node:test";
import { signupSchema, verifyEmailSchema } from "./auth.schema";

test("signupSchema accepts valid payload", () => {
  const result = signupSchema.safeParse({
    email: "user@example.com",
    password: "password123",
  });

  assert.equal(result.success, true);
});

test("signupSchema rejects invalid payload", () => {
  const result = signupSchema.safeParse({
    email: "not-an-email",
    password: "short",
  });

  assert.equal(result.success, false);
});

test("verifyEmailSchema validates code shape", () => {
  const valid = verifyEmailSchema.safeParse({
    email: "user@example.com",
    code: "123456",
  });
  assert.equal(valid.success, true);

  const invalid = verifyEmailSchema.safeParse({
    email: "user@example.com",
    code: "1",
  });
  assert.equal(invalid.success, false);
});

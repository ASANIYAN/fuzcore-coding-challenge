import assert from "node:assert/strict";
import test from "node:test";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "./auth.schema";

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

test("loginSchema validates login payload", () => {
  const valid = loginSchema.safeParse({
    email: "user@example.com",
    password: "password123",
  });
  assert.equal(valid.success, true);

  const invalid = loginSchema.safeParse({
    email: "user@example.com",
    password: "short",
  });
  assert.equal(invalid.success, false);
});

test("forgotPasswordSchema validates email", () => {
  const valid = forgotPasswordSchema.safeParse({
    email: "user@example.com",
  });
  assert.equal(valid.success, true);

  const invalid = forgotPasswordSchema.safeParse({
    email: "not-email",
  });
  assert.equal(invalid.success, false);
});

test("resetPasswordSchema validates reset payload", () => {
  const valid = resetPasswordSchema.safeParse({
    email: "user@example.com",
    code: "123456",
    newPassword: "newpassword123",
  });
  assert.equal(valid.success, true);

  const invalid = resetPasswordSchema.safeParse({
    email: "user@example.com",
    code: "123",
    newPassword: "short",
  });
  assert.equal(invalid.success, false);
});

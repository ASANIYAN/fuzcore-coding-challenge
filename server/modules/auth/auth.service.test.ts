import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestError, ConflictError } from "../../lib/errors";
import { hashOtp } from "../../lib/hmac";
import { AuthService } from "./auth.service";

type SelectRow = Record<string, unknown>;

function createMockDb(selectResults: SelectRow[][]) {
  const queue = [...selectResults];
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];

  const makeSelectBuilder = () => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: async () => queue.shift() ?? [],
        }),
        limit: async () => queue.shift() ?? [],
      }),
    }),
  });

  const tx = {
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          updates.push({ table, values });
        },
      }),
    }),
  };

  return {
    db: {
      select: () => makeSelectBuilder(),
      transaction: async (cb: (trx: typeof tx) => Promise<void>) => cb(tx),
    },
    updates,
  };
}

test("signup throws conflict when email already exists", async () => {
  const { db } = createMockDb([[{ id: "existing-user-id" }]]);
  const enqueueEmail = async () => ({});
  const authService = new AuthService({
    db: db as never,
    enqueueEmail: enqueueEmail as never,
  });

  await assert.rejects(
    authService.signup({
      email: "existing@example.com",
      password: "password123",
    }),
    (error: unknown) => {
      assert.equal(error instanceof ConflictError, true);
      return true;
    },
  );
});

test("verifyEmail throws bad request when user does not exist", async () => {
  const { db } = createMockDb([[]]);
  const enqueueEmail = async () => ({});
  const authService = new AuthService({
    db: db as never,
    enqueueEmail: enqueueEmail as never,
  });

  await assert.rejects(
    authService.verifyEmail({
      email: "missing@example.com",
      code: "123456",
    }),
    (error: unknown) => {
      assert.equal(error instanceof BadRequestError, true);
      return true;
    },
  );
});

test("verifyEmail throws bad request when code does not match", async () => {
  const { db } = createMockDb([
    [{ id: "user-id" }],
    [{ id: "code-id", codeHash: "00ff" }],
  ]);
  const enqueueEmail = async () => ({});
  const authService = new AuthService({
    db: db as never,
    enqueueEmail: enqueueEmail as never,
  });

  await assert.rejects(
    authService.verifyEmail({
      email: "user@example.com",
      code: "123456",
    }),
    (error: unknown) => {
      assert.equal(error instanceof BadRequestError, true);
      return true;
    },
  );
});

test("verifyEmail marks code used and user verified when code matches", async () => {
  const code = "123456";
  const hash = hashOtp(code);
  const { db, updates } = createMockDb([
    [{ id: "user-id" }],
    [{ id: "code-id", codeHash: hash }],
  ]);
  const enqueueEmail = async () => ({});
  const authService = new AuthService({
    db: db as never,
    enqueueEmail: enqueueEmail as never,
  });

  const result = await authService.verifyEmail({
    email: "user@example.com",
    code,
  });

  assert.equal(result.verified, true);
  assert.equal(result.message, "Email verified successfully.");
  assert.equal(updates.length, 2);
});

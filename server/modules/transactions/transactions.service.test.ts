import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { TransactionsService } from "./transactions.service";

function createMockDb() {
  const rowsQueue: unknown[][] = [];
  const updatedQueue: unknown[][] = [];

  return {
    rowsQueue,
    updatedQueue,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                offset: async () => rowsQueue.shift() ?? [],
              }),
            }),
            orderBy: async () => rowsQueue.shift() ?? [],
            limit: async () => rowsQueue.shift() ?? [],
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: async () => [{ id: "new-id", amount: 100n }],
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: async () => updatedQueue.shift() ?? [],
          }),
        }),
      }),
    },
  };
}

test("getTransactionById throws when transaction does not exist", async () => {
  const mock = createMockDb();
  mock.rowsQueue.push([]);
  const service = new TransactionsService({ db: mock.db as never });

  await assert.rejects(
    service.getTransactionById("user-id", "transaction-id"),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    },
  );
});

test("createTransaction throws for invalid category", async () => {
  const mock = createMockDb();
  mock.rowsQueue.push([]);
  const service = new TransactionsService({ db: mock.db as never });

  await assert.rejects(
    service.createTransaction("user-id", {
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      currency: "USD",
      transactionDate: new Date(),
    }),
    (error: unknown) => {
      assert.equal(error instanceof BadRequestError, true);
      return true;
    },
  );
});

test("createTransaction throws a friendly error for duplicate references", async () => {
  const mock = createMockDb();
  mock.rowsQueue.push([{ id: "category-id", type: "income" }]);
  const service = new TransactionsService({
    db: {
      ...mock.db,
      insert: () => ({
        values: () => ({
          returning: async () => {
            throw {
              code: "23505",
              constraint: "transactions_user_reference_unique",
            };
          },
        }),
      }),
    } as never,
  });

  await assert.rejects(
    service.createTransaction("user-id", {
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      currency: "USD",
      reference: "INV-2026-0001",
      transactionDate: new Date(),
    }),
    (error: unknown) => {
      assert.equal(error instanceof BadRequestError, true);
      assert.equal(
        (error as BadRequestError).message,
        "A transaction with this reference already exists.",
      );
      return true;
    },
  );
});

test("deleteTransaction throws when transaction does not exist", async () => {
  const mock = createMockDb();
  mock.updatedQueue.push([]);
  const service = new TransactionsService({ db: mock.db as never });

  await assert.rejects(
    service.deleteTransaction("user-id", "transaction-id"),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    },
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundError } from "../../lib/errors";
import { CustomersService } from "./customers.service";

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
            limit: async () => rowsQueue.shift() ?? [],
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: async () => [{ id: "new-id" }],
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

test("getCustomerById throws when customer does not exist", async () => {
  const mock = createMockDb();
  mock.rowsQueue.push([]);
  const service = new CustomersService({ db: mock.db as never });

  await assert.rejects(
    service.getCustomerById("user-id", "customer-id"),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    },
  );
});

test("updateCustomer throws when customer does not exist", async () => {
  const mock = createMockDb();
  mock.updatedQueue.push([]);
  const service = new CustomersService({ db: mock.db as never });

  await assert.rejects(
    service.updateCustomer("user-id", "customer-id", { displayName: "Updated" }),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    },
  );
});

test("deleteCustomer throws when customer does not exist", async () => {
  const mock = createMockDb();
  mock.updatedQueue.push([]);
  const service = new CustomersService({ db: mock.db as never });

  await assert.rejects(
    service.deleteCustomer("user-id", "customer-id"),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    },
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundError } from "../../lib/errors";
import { CategoriesService } from "./categories.service";

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
            orderBy: async () => rowsQueue.shift() ?? [],
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

test("getCategoryById throws when category does not exist", async () => {
  const mock = createMockDb();
  mock.rowsQueue.push([]);
  const service = new CategoriesService({ db: mock.db as never });

  await assert.rejects(
    service.getCategoryById("user-id", "category-id"),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    },
  );
});

test("updateCategory throws when category does not exist", async () => {
  const mock = createMockDb();
  mock.updatedQueue.push([]);
  const service = new CategoriesService({ db: mock.db as never });

  await assert.rejects(
    service.updateCategory("user-id", "category-id", { name: "Updated" }),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    },
  );
});

test("deleteCategory throws when category does not exist", async () => {
  const mock = createMockDb();
  mock.updatedQueue.push([]);
  const service = new CategoriesService({ db: mock.db as never });

  await assert.rejects(
    service.deleteCategory("user-id", "category-id"),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    },
  );
});

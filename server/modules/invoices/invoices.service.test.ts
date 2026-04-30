import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { InvoicesService } from "./invoices.service";

function createMockDb() {
  const rowsQueue: unknown[][] = [];

  return {
    rowsQueue,
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
      transaction: async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          insert: () => ({
            values: () => ({
              onConflictDoNothing: () => ({
                returning: async () => [],
              }),
              returning: async () => [{ id: "invoice-id" }],
            }),
          }),
          select: () => ({
            from: () => ({
              where: () => ({
                limit: async () => [{ lastInvoiceNumber: 0 }],
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: async () => {},
            }),
          }),
          delete: () => ({
            where: async () => {},
          }),
        }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: async () => rowsQueue.shift() ?? [],
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: async () => [{ id: "invoice-id" }],
        }),
      }),
    },
  };
}

test("getInvoiceById throws when invoice does not exist", async () => {
  const mock = createMockDb();
  mock.rowsQueue.push([]);
  const service = new InvoicesService({ db: mock.db as never });

  await assert.rejects(
    service.getInvoiceById("user-id", "invoice-id"),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    },
  );
});

test("updateInvoiceStatus rejects invalid transition attempts", async () => {
  const mock = createMockDb();
  mock.rowsQueue.push([
    {
      id: "invoice-id",
      userId: "user-id",
      status: "paid",
      paymentLink: null,
      sentAt: null,
      paidAt: new Date(),
      voidedAt: null,
      taxRate: null,
    },
  ]);
  const service = new InvoicesService({ db: mock.db as never });

  await assert.rejects(
    service.updateInvoiceStatus("user-id", "invoice-id", { status: "sent" }),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      return true;
    },
  );
});

test("createInvoicePaymentLink throws when invoice is not sent", async () => {
  const mock = createMockDb();
  mock.rowsQueue.push([
    {
      id: "invoice-id",
      userId: "user-id",
      invoiceNumber: 10,
      status: "draft",
      currency: "USD",
      taxRate: null,
      paymentLink: null,
    },
  ]);
  mock.rowsQueue.push([]);

  const service = new InvoicesService({
    db: mock.db as never,
    createStripeCheckoutSession: (async () => ({ url: null })) as never,
  });

  await assert.rejects(
    service.createInvoicePaymentLink("user-id", "invoice-id"),
    (error: unknown) => {
      assert.equal(error instanceof BadRequestError, true);
      return true;
    },
  );
});

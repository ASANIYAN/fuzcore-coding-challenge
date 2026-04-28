import assert from "node:assert/strict";
import test from "node:test";
import { DashboardService } from "./dashboard.service";

function createMockDb() {
  const queue: unknown[] = [];

  const makeSelectBuilder = () => ({
    from: () => ({
      where: () => ({
        groupBy: async () => (queue.shift() as unknown[]) ?? [],
        orderBy: () => ({
          limit: async () => (queue.shift() as unknown[]) ?? [],
        }),
      }),
    }),
  });

  return {
    queue,
    db: {
      select: () => makeSelectBuilder(),
    },
  };
}

test("getDashboard returns aggregated structure", async () => {
  const mock = createMockDb();
  mock.queue.push(
    [{ currency: "USD", amount: "5000" }], // revenue
    [{ currency: "USD", amount: "2000" }], // expenses
    [{ currency: "USD", amount: "3000", invoiceCount: 2 }], // outstanding
    [{ currency: "USD", amount: "1000", invoiceCount: 1 }], // overdue
    [
      {
        id: "txn-id",
        amount: 2500n,
      },
    ], // recent tx
    [{ id: "inv-id", status: "sent" }], // recent invoices
  );

  const service = new DashboardService({ db: mock.db as never });
  const result = await service.getDashboard("user-id", {});

  assert.equal(Array.isArray(result.revenue), true);
  assert.equal(result.revenue[0]?.amount, "5000");
  assert.equal(result.expenses[0]?.amount, "2000");
  assert.equal(result.net[0]?.amount, "3000");
  assert.equal(result.outstanding[0]?.invoiceCount, 2);
  assert.equal(result.overdue[0]?.invoiceCount, 1);
  assert.equal(result.recentTransactions[0]?.amount, "2500");
  assert.equal(result.recentInvoices[0]?.id, "inv-id");
});

import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestError } from "../../lib/errors";
import { WebhooksService } from "./webhooks.service";

function createMockDb(selectRows: unknown[][]) {
  const queue = [...selectRows];
  const updates: Array<Record<string, unknown>> = [];
  const inserts: Array<Record<string, unknown>> = [];

  const selectBuilder = () => ({
    from: () => ({
      where: () => ({
        for: () => ({
          limit: async () => queue.shift() ?? [],
        }),
        limit: async () => queue.shift() ?? [],
      }),
    }),
  });

  const tx = {
    select: () => selectBuilder(),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return {
          where: async () => {},
        };
      },
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        inserts.push(values);
        return {
          onConflictDoNothing: async () => {},
        };
      },
    }),
  };

  return {
    updates,
    inserts,
    db: {
      select: () => selectBuilder(),
      transaction: async (cb: (trx: typeof tx) => Promise<unknown>) => cb(tx),
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          inserts.push(values);
          return {
            onConflictDoNothing: async () => {},
          };
        },
      }),
    },
  };
}

test("handleStripeWebhook throws on invalid signature", async () => {
  const { db } = createMockDb([]);
  const service = new WebhooksService({
    db: db as never,
    enqueueEmailJob: (async () => ({})) as never,
    constructEvent: (() => {
      throw new Error("invalid signature");
    }) as never,
  });

  await assert.rejects(
    service.handleStripeWebhook(Buffer.from("{}"), "invalid"),
    (error: unknown) => {
      assert.equal(error instanceof BadRequestError, true);
      return true;
    },
  );
});

test("handleStripeWebhook marks sent invoice as paid and stores processed event", async () => {
  const { db, updates, inserts } = createMockDb([
    [],
    [
      {
        id: "invoice-id",
        userId: "user-id",
        invoiceNumber: 42,
        status: "sent",
      },
    ],
    [{ email: "owner@example.com" }],
  ]);
  const jobs: Array<Record<string, unknown>> = [];

  const service = new WebhooksService({
    db: db as never,
    enqueueEmailJob: (async (payload: Record<string, unknown>) => {
      jobs.push(payload);
      return {};
    }) as never,
    constructEvent: (() =>
      ({
        id: "evt_123",
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              invoiceId: "invoice-id",
            },
          },
        },
      }) as never) as never,
  });

  const result = await service.handleStripeWebhook(Buffer.from("{}"), "valid");

  assert.deepEqual(result, { received: true });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, "paid");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].eventId, "evt_123");
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].to, "owner@example.com");
});

test("handleStripeWebhook ignores duplicate event ids", async () => {
  const { db, updates, inserts } = createMockDb([[{ id: "processed-id" }]]);
  const jobs: Array<Record<string, unknown>> = [];

  const service = new WebhooksService({
    db: db as never,
    enqueueEmailJob: (async (payload: Record<string, unknown>) => {
      jobs.push(payload);
      return {};
    }) as never,
    constructEvent: (() =>
      ({
        id: "evt_duplicate",
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              invoiceId: "invoice-id",
            },
          },
        },
      }) as never) as never,
  });

  const result = await service.handleStripeWebhook(Buffer.from("{}"), "valid");

  assert.deepEqual(result, { received: true });
  assert.equal(updates.length, 0);
  assert.equal(inserts.length, 0);
  assert.equal(jobs.length, 0);
});

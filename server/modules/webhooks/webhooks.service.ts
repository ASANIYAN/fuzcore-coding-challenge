import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "../../db";
import { BadRequestError } from "../../lib/errors";
import { enqueueEmailJob } from "../../lib/queue";
import { env } from "../../lib/env";
import { invoices, processedWebhookEvents, users } from "../../../shared/schema";

type Db = typeof db;
type EnqueueEmailJob = typeof enqueueEmailJob;
type ConstructEvent = (
  payload: Buffer,
  signature: string,
  secret: string,
) => Stripe.Event;

type WebhooksServiceDeps = {
  db: Db;
  enqueueEmailJob: EnqueueEmailJob;
  constructEvent: ConstructEvent;
};

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

function getInvoiceIdFromEvent(event: Stripe.Event) {
  if (event.type !== "checkout.session.completed") {
    return null;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  return (
    session.metadata?.invoiceId ??
    session.metadata?.invoice_id ??
    session.client_reference_id ??
    null
  );
}

export class WebhooksService {
  private readonly db: Db;
  private readonly enqueueEmailJob: EnqueueEmailJob;
  private readonly constructEvent: ConstructEvent;

  constructor(deps?: Partial<WebhooksServiceDeps>) {
    this.db = deps?.db ?? db;
    this.enqueueEmailJob = deps?.enqueueEmailJob ?? enqueueEmailJob;
    this.constructEvent =
      deps?.constructEvent ??
      ((payload, signature, secret) =>
        stripeClient.webhooks.constructEvent(payload, signature, secret));
  }

  verifyStripeWebhook(payload: Buffer, signature: string | undefined) {
    if (!signature) {
      throw new BadRequestError("Missing Stripe signature");
    }

    try {
      return this.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new BadRequestError("Invalid Stripe signature");
    }
  }

  async processStripeEvent(event: Stripe.Event) {

    const [processedEvent] = await this.db
      .select({ id: processedWebhookEvents.id })
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.eventId, event.id))
      .limit(1);

    if (processedEvent) {
      return { received: true };
    }

    const invoiceId = getInvoiceIdFromEvent(event);
    if (!invoiceId) {
      return { received: true };
    }

    const result = await this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .select({
          id: invoices.id,
          userId: invoices.userId,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
        })
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .for("update")
        .limit(1);

      if (!invoice || invoice.status !== "sent") {
        return null;
      }

      const now = new Date();
      await tx
        .update(invoices)
        .set({
          status: "paid",
          paidAt: now,
          updatedAt: now,
        })
        .where(and(eq(invoices.id, invoice.id), eq(invoices.status, "sent")));

      await tx
        .insert(processedWebhookEvents)
        .values({
          eventId: event.id,
          eventType: event.type,
        })
        .onConflictDoNothing();

      return {
        userId: invoice.userId,
        invoiceNumber: invoice.invoiceNumber,
      };
    });

    if (!result) {
      return { received: true };
    }

    const [user] = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, result.userId))
      .limit(1);

    if (user?.email) {
      await this.enqueueEmailJob({
        to: user.email,
        subject: `Invoice #${result.invoiceNumber} paid`,
        text: `Invoice #${result.invoiceNumber} has been marked as paid.`,
      });
    }

    return { received: true };
  }

  async handleStripeWebhook(payload: Buffer, signature: string | undefined) {
    const event = this.verifyStripeWebhook(payload, signature);
    return this.processStripeEvent(event);
  }
}

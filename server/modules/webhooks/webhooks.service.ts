import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "../../db";
import { BadRequestError } from "../../lib/errors";
import { enqueueEmailJob } from "../../lib/queue";
import { env } from "../../lib/env";
import { logger } from "../../lib/logger";
import {
  invoices,
  processedWebhookEvents,
  users,
} from "../../../shared/schema";

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

function getInvoiceIdFromMetadata(
  metadata: Record<string, string> | null | undefined,
) {
  return metadata?.invoiceId ?? metadata?.invoice_id ?? null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getInvoiceIdFromEventObject(event: Stripe.Event) {
  if (event.type !== "checkout.session.completed") {
    logger.debug(
      { eventId: event.id, eventType: event.type },
      "stripe webhook event ignored: only checkout.session.completed is processed",
    );
    return null;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadataInvoiceId = getInvoiceIdFromMetadata(session.metadata);
  const rawInvoiceId = metadataInvoiceId ?? session.client_reference_id ?? null;
  const invoiceId = typeof rawInvoiceId === "string" ? rawInvoiceId.trim() : null;

  logger.debug(
    {
      eventId: event.id,
      eventType: event.type,
      invoiceId,
      source:
        metadataInvoiceId != null
          ? "session.metadata.invoiceId"
          : session.client_reference_id != null
            ? "session.client_reference_id"
            : "none",
    },
    "stripe webhook invoice id resolved from checkout session",
  );

  return invoiceId;
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
      logger.warn(
        { hasSignature: false },
        "stripe webhook rejected: missing signature",
      );
      throw new BadRequestError("Missing Stripe signature");
    }

    try {
      const event = this.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
      logger.info(
        {
          eventId: event.id,
          eventType: event.type,
          payloadBytes: payload.length,
        },
        "stripe webhook signature verified",
      );
      return event;
    } catch {
      logger.warn(
        { hasSignature: true, payloadBytes: payload.length },
        "stripe webhook rejected: invalid signature",
      );
      throw new BadRequestError("Invalid Stripe signature");
    }
  }

  async processStripeEvent(event: Stripe.Event) {
    logger.info(
      { eventId: event.id, eventType: event.type },
      "stripe webhook processing started",
    );

    const [processedEvent] = await this.db
      .select({ id: processedWebhookEvents.id })
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.eventId, event.id))
      .limit(1);

    if (processedEvent) {
      logger.info(
        { eventId: event.id, eventType: event.type },
        "stripe webhook duplicate ignored",
      );
      return { received: true };
    }

    const invoiceId = getInvoiceIdFromEventObject(event);
    logger.debug(
      {
        eventId: event.id,
        eventType: event.type,
        invoiceIdFromEvent: invoiceId,
      },
      "stripe webhook invoice resolution from event object",
    );

    if (!invoiceId) {
      logger.info(
        { eventId: event.id, eventType: event.type },
        "stripe webhook ignored: no invoiceId resolved",
      );
      return { received: true };
    }
    if (!isUuid(invoiceId)) {
      logger.warn(
        { eventId: event.id, eventType: event.type, invoiceId },
        "stripe webhook ignored: invoiceId is not a valid uuid",
      );
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

      logger.debug(
        {
          eventId: event.id,
          eventType: event.type,
          invoiceId,
          invoiceFound: Boolean(invoice),
          currentStatus: invoice?.status ?? null,
        },
        "stripe webhook invoice loaded for sent->paid status gate",
      );

      if (!invoice || invoice.status !== "sent") {
        logger.info(
          {
            eventId: event.id,
            eventType: event.type,
            invoiceId,
            invoiceFound: Boolean(invoice),
            currentStatus: invoice?.status ?? null,
          },
          "stripe webhook invoice skipped: not found or not sent",
        );
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

      await tx.insert(processedWebhookEvents).values({
        eventId: event.id,
        eventType: event.type,
      });

      return {
        invoiceId: invoice.id,
        userId: invoice.userId,
        invoiceNumber: invoice.invoiceNumber,
      };
    });

    if (!result) {
      return { received: true };
    }

    logger.info(
      {
        eventId: event.id,
        eventType: event.type,
        invoiceId,
        invoiceNumber: result.invoiceNumber,
      },
      "stripe webhook invoice marked paid",
    );

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
      logger.info(
        {
          eventId: event.id,
          invoiceNumber: result.invoiceNumber,
          recipient: user.email,
        },
        "stripe webhook payment confirmation email queued",
      );
    } else {
      logger.warn(
        { eventId: event.id, invoiceNumber: result.invoiceNumber },
        "stripe webhook owner email missing; confirmation email not queued",
      );
    }

    logger.info(
      { eventId: event.id, eventType: event.type },
      "stripe webhook event persisted",
    );

    return { received: true };
  }

  async handleStripeWebhook(payload: Buffer, signature: string | undefined) {
    const event = this.verifyStripeWebhook(payload, signature);
    return this.processStripeEvent(event);
  }
}

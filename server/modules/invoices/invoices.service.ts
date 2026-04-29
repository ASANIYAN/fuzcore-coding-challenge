import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import Stripe from "stripe";
import { db } from "../../db";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { toMinorUnits } from "../../lib/currency";
import { env } from "../../lib/env";
import { enqueueEmailJob } from "../../lib/queue";
import {
  customers,
  invoiceItems,
  invoices,
  users,
  userInvoiceCounters,
} from "../../../shared/schema";
import type {
  CreateInvoiceInput,
  ListInvoicesQuery,
  UpdateInvoiceInput,
  UpdateInvoiceStatusInput,
} from "./invoices.schema";

type Db = typeof db;

type InvoicesServiceDeps = {
  db: Db;
  enqueueEmail: typeof enqueueEmailJob;
  createStripeCheckoutSession: (
    params: Stripe.Checkout.SessionCreateParams,
  ) => Promise<{ url: string | null }>;
};

const ALLOWED_STATUS_TRANSITIONS: Record<
  "draft" | "sent" | "paid" | "void",
  Array<"draft" | "sent" | "paid" | "void">
> = {
  draft: ["sent", "void"],
  sent: ["paid", "void"],
  paid: [],
  void: [],
};

function buildInvoiceTotals(
  items: Array<{ quantity: string; unitPrice: bigint }>,
  taxRateValue: string | null,
) {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = BigInt(Math.round(Number(item.quantity) * Number(item.unitPrice)));
    return sum + lineTotal;
  }, BigInt(0));

  const taxRate = taxRateValue ? Number(taxRateValue) : 0;
  const taxAmount = BigInt(Math.round(Number(subtotal) * (taxRate / 100)));
  const total = subtotal + taxAmount;

  return {
    subtotal: subtotal.toString(),
    taxAmount: taxAmount.toString(),
    total: total.toString(),
  };
}

export class InvoicesService {
  private readonly db: Db;
  private readonly enqueueEmail: typeof enqueueEmailJob;
  private readonly createStripeCheckoutSession: InvoicesServiceDeps["createStripeCheckoutSession"];

  private readonly frontendOrigin = env.FRONTEND_ORIGIN ?? "http://localhost:5173";

  constructor(deps?: Partial<InvoicesServiceDeps>) {
    this.db = deps?.db ?? db;
    this.enqueueEmail = deps?.enqueueEmail ?? enqueueEmailJob;
    this.createStripeCheckoutSession =
      deps?.createStripeCheckoutSession ??
      (async (params) => {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2025-08-27.basil",
        });
        return stripe.checkout.sessions.create(params);
      });
  }

  private async ensureCustomerForUser(userId: string, customerId: string) {
    const [customer] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.userId, userId)))
      .limit(1);

    if (!customer) {
      throw new BadRequestError("Invalid customer for this user");
    }
  }

  private async loadInvoiceWithItems(userId: string, invoiceId: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .limit(1);

    if (!invoice) {
      throw new NotFoundError("Invoice");
    }

    const items = await this.db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id))
      .orderBy(asc(invoiceItems.sortOrder));

    const totals = buildInvoiceTotals(
      items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      invoice.taxRate,
    );

    return {
      ...invoice,
      items: items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
      })),
      ...totals,
    };
  }

  async listInvoices(userId: string, query: ListInvoicesQuery) {
    const conditions = [eq(invoices.userId, userId)];
    if (query.status) conditions.push(eq(invoices.status, query.status));
    if (query.customerId) conditions.push(eq(invoices.customerId, query.customerId));
    if (query.from) conditions.push(gte(invoices.issueDate, query.from));
    if (query.to) conditions.push(lte(invoices.issueDate, query.to));

    const whereClause = and(...conditions);
    const offset = (query.page - 1) * query.limit;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(invoices)
        .where(whereClause)
        .orderBy(desc(invoices.createdAt))
        .limit(query.limit)
        .offset(offset),
      this.db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(invoices)
        .where(whereClause),
    ]);

    const invoiceIds = rows.map((row) => row.id);
    const allItems =
      invoiceIds.length > 0
        ? await this.db
            .select()
            .from(invoiceItems)
            .where(inArray(invoiceItems.invoiceId, invoiceIds))
        : [];

    const itemMap = new Map<string, Array<{ quantity: string; unitPrice: bigint }>>();
    for (const item of allItems) {
      const existing = itemMap.get(item.invoiceId) ?? [];
      existing.push({ quantity: item.quantity, unitPrice: item.unitPrice });
      itemMap.set(item.invoiceId, existing);
    }

    const enriched = rows.map((row) => ({
      ...row,
      ...buildInvoiceTotals(itemMap.get(row.id) ?? [], row.taxRate),
    }));

    return {
      rows: enriched,
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async getInvoiceById(userId: string, invoiceId: string) {
    return this.loadInvoiceWithItems(userId, invoiceId);
  }

  async createInvoice(userId: string, input: CreateInvoiceInput) {
    await this.ensureCustomerForUser(userId, input.customerId);
    const now = new Date();

    const result = await this.db.transaction(async (tx) => {
      await tx
        .insert(userInvoiceCounters)
        .values({
          userId,
          lastInvoiceNumber: 0,
        })
        .onConflictDoNothing();

      const [counterRow] = await tx
        .select()
        .from(userInvoiceCounters)
        .where(eq(userInvoiceCounters.userId, userId))
        .for("update")
        .limit(1);

      const nextInvoiceNumber = (counterRow?.lastInvoiceNumber ?? 0) + 1;

      await tx
        .update(userInvoiceCounters)
        .set({
          lastInvoiceNumber: nextInvoiceNumber,
        })
        .where(eq(userInvoiceCounters.userId, userId));

      const [invoice] = await tx
        .insert(invoices)
        .values({
          userId,
          customerId: input.customerId,
          invoiceNumber: nextInvoiceNumber,
          status: "draft",
          currency: input.currency,
          taxRate: input.taxRate == null ? null : input.taxRate.toString(),
          issueDate: input.issueDate,
          dueDate: input.dueDate ?? null,
          notes: input.notes ?? null,
          updatedAt: now,
        })
        .returning();

      await tx.insert(invoiceItems).values(
        input.items.map((item) => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: toMinorUnits(item.unitPrice, input.currency),
          sortOrder: item.sortOrder,
        })),
      );

      return invoice.id;
    });

    return this.loadInvoiceWithItems(userId, result);
  }

  async updateInvoice(userId: string, invoiceId: string, input: UpdateInvoiceInput) {
    const [existing] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Invoice");
    }

    if (existing.status !== "draft") {
      throw new BadRequestError("Only draft invoices can be updated");
    }

    if (input.customerId) {
      await this.ensureCustomerForUser(userId, input.customerId);
    }

    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx
        .update(invoices)
        .set({
          customerId: input.customerId ?? existing.customerId,
          taxRate: input.taxRate == null ? null : input.taxRate.toString(),
          issueDate: input.issueDate ?? existing.issueDate,
          dueDate: input.dueDate === undefined ? existing.dueDate : input.dueDate,
          notes: input.notes === undefined ? existing.notes : input.notes,
          updatedAt: now,
        })
        .where(eq(invoices.id, invoiceId));

      if (input.items) {
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
        await tx.insert(invoiceItems).values(
          input.items.map((item) => ({
            invoiceId,
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: toMinorUnits(item.unitPrice, existing.currency),
            sortOrder: item.sortOrder,
          })),
        );
      }
    });

    return this.loadInvoiceWithItems(userId, invoiceId);
  }

  async updateInvoiceStatus(
    userId: string,
    invoiceId: string,
    input: UpdateInvoiceStatusInput,
  ) {
    const [existing] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Invoice");
    }

    if (!ALLOWED_STATUS_TRANSITIONS[existing.status].includes(input.status)) {
      throw new BadRequestError(
        `Cannot transition invoice status from ${existing.status} to ${input.status}`,
      );
    }

    if (input.status === "sent") {
      const invoiceWithItems = await this.loadInvoiceWithItems(userId, invoiceId);
      const paymentLink =
        invoiceWithItems.paymentLink ??
        (await this.createStripePaymentLinkForInvoice(invoiceWithItems));
      const now = new Date();

      const [updated] = await this.db.transaction(async (tx) => {
        const [locked] = await tx
          .select()
          .from(invoices)
          .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
          .for("update")
          .limit(1);

        if (!locked) {
          throw new NotFoundError("Invoice");
        }
        if (locked.status !== "draft") {
          throw new BadRequestError("Only draft invoices can transition to sent");
        }

        return tx
          .update(invoices)
          .set({
            status: "sent",
            sentAt: now,
            paymentLink,
            updatedAt: now,
          })
          .where(eq(invoices.id, invoiceId))
          .returning();
      });

      const [owner] = await this.db
        .select({
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, updated.userId))
        .limit(1);
      if (owner?.email) {
        await this.enqueueEmail({
          to: owner.email,
          subject: `Invoice #${updated.invoiceNumber} sent`,
          text: `Invoice #${updated.invoiceNumber} was sent successfully.`,
        });
      }

      return this.loadInvoiceWithItems(userId, updated.id);
    }

    const now = new Date();
    const [updated] = await this.db
      .update(invoices)
      .set({
        status: input.status,
        sentAt: existing.sentAt,
        paidAt: input.status === "paid" ? now : existing.paidAt,
        voidedAt: input.status === "void" ? now : existing.voidedAt,
        paymentLink: existing.paymentLink,
        updatedAt: now,
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    return this.loadInvoiceWithItems(userId, updated.id);
  }

  async createInvoicePaymentLink(userId: string, invoiceId: string) {
    const invoice = await this.loadInvoiceWithItems(userId, invoiceId);
    if (invoice.status !== "sent") {
      throw new BadRequestError("Payment link can only be created for sent invoices");
    }

    if (invoice.paymentLink) {
      return {
        paymentLink: invoice.paymentLink,
      };
    }

    const paymentLink = await this.createStripePaymentLinkForInvoice(invoice);

    await this.db
      .update(invoices)
      .set({
        paymentLink,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, invoice.id), eq(invoices.userId, userId)));

    return {
      paymentLink,
    };
  }

  private async createStripePaymentLinkForInvoice(
    invoice: Awaited<ReturnType<InvoicesService["loadInvoiceWithItems"]>>,
  ) {
    const totalMinorUnits = Number(invoice.total);
    if (!Number.isSafeInteger(totalMinorUnits) || totalMinorUnits <= 0) {
      throw new BadRequestError("Invoice total is invalid for payment link creation");
    }

    const session = await this.createStripeCheckoutSession({
      mode: "payment",
      metadata: {
        invoiceId: invoice.id,
      },
      client_reference_id: invoice.id,
      success_url: `${this.frontendOrigin}/invoices/${invoice.id}?payment=success`,
      cancel_url: `${this.frontendOrigin}/invoices/${invoice.id}?payment=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: invoice.currency.toLowerCase(),
            unit_amount: totalMinorUnits,
            product_data: {
              name: `Invoice #${invoice.invoiceNumber}`,
            },
          },
        },
      ],
    });

    if (!session.url) {
      throw new BadRequestError("Unable to create payment link");
    }

    return session.url;
  }

  async getInvoicePdf(userId: string, invoiceId: string) {
    const invoice = await this.loadInvoiceWithItems(userId, invoiceId);
    const issueDate = new Date(invoice.issueDate).toISOString().slice(0, 10);
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "-";

    const doc = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve());
      doc.on("error", reject);

      doc.fontSize(20).text(`Invoice #${invoice.invoiceNumber}`);
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Status: ${invoice.status}`);
      doc.text(`Issue Date: ${issueDate}`);
      doc.text(`Due Date: ${dueDate}`);
      doc.text(`Currency: ${invoice.currency}`);
      doc.text(`Subtotal (minor units): ${invoice.subtotal}`);
      doc.text(`Tax (minor units): ${invoice.taxAmount}`);
      doc.text(`Total (minor units): ${invoice.total}`);
      doc.moveDown();
      doc.fontSize(13).text("Line Items");
      doc.moveDown(0.4);
      for (const item of invoice.items) {
        doc
          .fontSize(10)
          .text(
            `${item.sortOrder + 1}. ${item.description} | Qty: ${item.quantity} | Unit: ${item.unitPrice}`,
          );
      }

      doc.end();
    });

    return {
      fileName: `invoice-${invoice.invoiceNumber}.pdf`,
      buffer: Buffer.concat(chunks),
    };
  }
}

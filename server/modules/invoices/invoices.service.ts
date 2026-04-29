import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "../../db";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { toMinorUnits } from "../../lib/currency";
import { env } from "../../lib/env";
import {
  customers,
  invoiceItems,
  invoices,
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
  private readonly createStripeCheckoutSession: InvoicesServiceDeps["createStripeCheckoutSession"];

  private readonly frontendOrigin = env.FRONTEND_ORIGIN ?? "http://localhost:5173";

  constructor(deps?: Partial<InvoicesServiceDeps>) {
    this.db = deps?.db ?? db;
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

    const now = new Date();
    const [updated] = await this.db
      .update(invoices)
      .set({
        status: input.status,
        sentAt: input.status === "sent" ? now : existing.sentAt,
        paidAt: input.status === "paid" ? now : existing.paidAt,
        voidedAt: input.status === "void" ? now : existing.voidedAt,
        paymentLink:
          input.status === "sent" && !existing.paymentLink
            ? `https://pay.example.com/invoices/${existing.id}`
            : existing.paymentLink,
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

    await this.db
      .update(invoices)
      .set({
        paymentLink: session.url,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, invoice.id), eq(invoices.userId, userId)));

    return {
      paymentLink: session.url,
    };
  }

  async getInvoicePdf(userId: string, invoiceId: string) {
    const invoice = await this.loadInvoiceWithItems(userId, invoiceId);
    const issueDate = new Date(invoice.issueDate).toISOString().slice(0, 10);
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toISOString().slice(0, 10)
      : "N/A";
    const pdfText = [
      `%PDF-1.1`,
      `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`,
      `2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj`,
      `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj`,
      `4 0 obj<</Length 220>>stream`,
      `BT /F1 12 Tf 72 740 Td (Invoice #${invoice.invoiceNumber}) Tj T* (Status: ${invoice.status}) Tj T* (Issue Date: ${issueDate}) Tj T* (Due Date: ${dueDate}) Tj T* (Currency: ${invoice.currency}) Tj T* (Total minor units: ${invoice.total}) Tj ET`,
      `endstream endobj`,
      `5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj`,
      `xref`,
      `0 6`,
      `0000000000 65535 f `,
      `0000000010 00000 n `,
      `0000000053 00000 n `,
      `0000000108 00000 n `,
      `0000000238 00000 n `,
      `0000000535 00000 n `,
      `trailer<</Size 6/Root 1 0 R>>`,
      `startxref`,
      `607`,
      `%%EOF`,
    ].join("\n");

    return {
      fileName: `invoice-${invoice.invoiceNumber}.pdf`,
      buffer: Buffer.from(pdfText, "utf-8"),
    };
  }
}

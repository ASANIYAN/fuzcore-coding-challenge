import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { invoices, transactions } from "../../../shared/schema";
import type { DashboardQuery } from "./dashboard.schema";

type Db = typeof db;

type DashboardServiceDeps = {
  db: Db;
};

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
}

function endOfMonth(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

type MonetaryGroup = { currency: string; amount: string };

function groupToMonetaryMap(rows: Array<{ currency: string; amount: string | number | bigint }>) {
  return rows.map((row) => ({
    currency: row.currency,
    amount: String(row.amount),
  }));
}

function subtractGroupedAmounts(revenue: MonetaryGroup[], expenses: MonetaryGroup[]) {
  const map = new Map<string, bigint>();
  for (const row of revenue) {
    map.set(row.currency, (map.get(row.currency) ?? BigInt(0)) + BigInt(row.amount));
  }
  for (const row of expenses) {
    map.set(row.currency, (map.get(row.currency) ?? BigInt(0)) - BigInt(row.amount));
  }

  return Array.from(map.entries()).map(([currency, amount]) => ({
    currency,
    amount: amount.toString(),
  }));
}

export class DashboardService {
  private readonly db: Db;

  constructor(deps?: Partial<DashboardServiceDeps>) {
    this.db = deps?.db ?? db;
  }

  async getDashboard(userId: string, query: DashboardQuery) {
    const now = new Date();
    const from = query.from ?? startOfMonth(now);
    const to = query.to ?? endOfMonth(now);

    const txPeriodCondition = and(
      eq(transactions.userId, userId),
      gte(transactions.transactionDate, from),
      lte(transactions.transactionDate, to),
    );

    const [revenueRows, expenseRows, outstandingRows, overdueRows, recentTransactions, recentInvoices] =
      await Promise.all([
        this.db
          .select({
            currency: transactions.currency,
            amount: sql<string>`sum(${transactions.amount})`,
          })
          .from(transactions)
          .where(and(txPeriodCondition, eq(transactions.type, "income")))
          .groupBy(transactions.currency),
        this.db
          .select({
            currency: transactions.currency,
            amount: sql<string>`sum(${transactions.amount})`,
          })
          .from(transactions)
          .where(and(txPeriodCondition, eq(transactions.type, "expense")))
          .groupBy(transactions.currency),
        this.db
          .select({
            currency: invoices.currency,
            amount: sql<string>`coalesce(sum(${sql.raw(
              `(select coalesce(sum((item.quantity::numeric * item.unit_price::numeric)::bigint), 0) from invoice_items item where item.invoice_id = invoices.id)`,
            )}), 0)`,
            invoiceCount: sql<number>`count(*)`,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.userId, userId),
              eq(invoices.status, "sent"),
              gte(invoices.dueDate, now),
            ),
          )
          .groupBy(invoices.currency),
        this.db
          .select({
            currency: invoices.currency,
            amount: sql<string>`coalesce(sum(${sql.raw(
              `(select coalesce(sum((item.quantity::numeric * item.unit_price::numeric)::bigint), 0) from invoice_items item where item.invoice_id = invoices.id)`,
            )}), 0)`,
            invoiceCount: sql<number>`count(*)`,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.userId, userId),
              eq(invoices.status, "sent"),
              lte(invoices.dueDate, now),
            ),
          )
          .groupBy(invoices.currency),
        this.db
          .select()
          .from(transactions)
          .where(eq(transactions.userId, userId))
          .orderBy(desc(transactions.transactionDate))
          .limit(5),
        this.db
          .select()
          .from(invoices)
          .where(eq(invoices.userId, userId))
          .orderBy(desc(invoices.createdAt))
          .limit(5),
      ]);

    const revenue = groupToMonetaryMap(revenueRows);
    const expenses = groupToMonetaryMap(expenseRows);
    const net = subtractGroupedAmounts(revenue, expenses);

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      revenue,
      expenses,
      net,
      outstanding: outstandingRows.map((row) => ({
        currency: row.currency,
        amount: String(row.amount),
        invoiceCount: Number(row.invoiceCount),
      })),
      overdue: overdueRows.map((row) => ({
        currency: row.currency,
        amount: String(row.amount),
        invoiceCount: Number(row.invoiceCount),
      })),
      recentTransactions: recentTransactions.map((item) => ({
        ...item,
        amount: item.amount.toString(),
      })),
      recentInvoices,
    };
  }
}

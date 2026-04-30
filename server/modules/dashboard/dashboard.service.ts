import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { isSupportedCurrency, toDecimal } from "../../lib/currency";
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

type MonetaryGroup = { currency: string; amount: bigint };

function parseMinorAmount(value: string | number | bigint): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return BigInt(0);
    }
    return BigInt(Math.round(value));
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return BigInt(0);
  }

  if (/^-?\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }

  const parsed = Number(trimmed);
  if (Number.isFinite(parsed)) {
    return BigInt(Math.round(parsed));
  }

  return BigInt(0);
}

function groupToMonetaryMap(rows: Array<{ currency: string; amount: string | number | bigint }>) {
  return rows.map((row) => ({
    currency: row.currency,
    amount: parseMinorAmount(row.amount),
  }));
}

function subtractGroupedAmounts(revenue: MonetaryGroup[], expenses: MonetaryGroup[]) {
  const map = new Map<string, bigint>();
  for (const row of revenue) {
    map.set(row.currency, (map.get(row.currency) ?? BigInt(0)) + row.amount);
  }
  for (const row of expenses) {
    map.set(row.currency, (map.get(row.currency) ?? BigInt(0)) - row.amount);
  }

  return Array.from(map.entries()).map(([currency, amount]) => ({
    currency,
    amount,
  }));
}

function toDashboardAmount(currency: string, amount: bigint): number | null {
  if (!isSupportedCurrency(currency)) {
    return null;
  }
  return toDecimal(amount, currency);
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
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

    const safeInvoiceItemsTotalSql = sql.raw(
      `(select coalesce(sum(((case when trim(coalesce(item.quantity, '')) ~ '^-?[0-9]+(\\.[0-9]+)?$' then item.quantity::numeric else 0 end) * coalesce(item.unit_price, 0)::numeric)::bigint), 0) from invoice_items item where item.invoice_id = invoices.id)`,
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
            amount: sql<string>`coalesce(sum(${safeInvoiceItemsTotalSql}), 0)`,
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
            amount: sql<string>`coalesce(sum(${safeInvoiceItemsTotalSql}), 0)`,
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
      revenue: revenue
        .map((item) => ({
          currency: item.currency,
          amount: toDashboardAmount(item.currency, item.amount),
        }))
        .filter((item): item is { currency: string; amount: number } => item.amount !== null),
      expenses: expenses
        .map((item) => ({
          currency: item.currency,
          amount: toDashboardAmount(item.currency, item.amount),
        }))
        .filter((item): item is { currency: string; amount: number } => item.amount !== null),
      net: net
        .map((item) => ({
          currency: item.currency,
          amount: toDashboardAmount(item.currency, item.amount),
        }))
        .filter((item): item is { currency: string; amount: number } => item.amount !== null),
      outstanding: outstandingRows
        .map((row) => ({
          currency: row.currency,
          amount: toDashboardAmount(row.currency, parseMinorAmount(row.amount)),
          invoiceCount: Number(row.invoiceCount),
        }))
        .filter(
          (row): row is { currency: string; amount: number; invoiceCount: number } =>
            row.amount !== null,
        ),
      overdue: overdueRows
        .map((row) => ({
          currency: row.currency,
          amount: toDashboardAmount(row.currency, parseMinorAmount(row.amount)),
          invoiceCount: Number(row.invoiceCount),
        }))
        .filter(
          (row): row is { currency: string; amount: number; invoiceCount: number } =>
            row.amount !== null,
        ),
      recentTransactions: recentTransactions
        .map((item) => {
          const amount = toDashboardAmount(item.currency, item.amount);
          if (amount === null) {
            return null;
          }
          const { importHash: _importHash, ...rest } = item;
          return {
            ...rest,
            amount,
          };
        })
        .filter(isNotNull),
      recentInvoices,
    };
  }
}

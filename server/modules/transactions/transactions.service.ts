import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { toMinorUnits } from "../../lib/currency";
import { enqueueTransactionImportJob } from "../../lib/queue";
import { categories, customers, transactions } from "../../../shared/schema";
import type {
  CreateTransactionInput,
  ImportTransactionsInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from "./transactions.schema";

type Db = typeof db;
type TransactionRow = typeof transactions.$inferSelect;

type TransactionsServiceDeps = {
  db: Db;
  enqueueImportJob: typeof enqueueTransactionImportJob;
};

function serializeTransaction(row: TransactionRow) {
  return {
    ...row,
    amount: row.amount.toString(),
  };
}

export class TransactionsService {
  private readonly db: Db;
  private readonly enqueueImportJob: typeof enqueueTransactionImportJob;

  constructor(deps?: Partial<TransactionsServiceDeps>) {
    this.db = deps?.db ?? db;
    this.enqueueImportJob = deps?.enqueueImportJob ?? enqueueTransactionImportJob;
  }

  private async ensureCategoryForUser(
    userId: string,
    categoryId: string,
    expectedType: "income" | "expense",
  ) {
    const [category] = await this.db
      .select({
        id: categories.id,
        type: categories.type,
      })
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId),
          isNull(categories.archivedAt),
        ),
      )
      .limit(1);

    if (!category) {
      throw new BadRequestError("Invalid category for this user");
    }
    if (category.type !== expectedType) {
      throw new BadRequestError("Category type does not match transaction type");
    }
  }

  private async ensureCustomerForUser(userId: string, customerId: string | null | undefined) {
    if (!customerId) {
      return;
    }

    const [customer] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.userId, userId),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new BadRequestError("Invalid customer for this user");
    }
  }

  async listTransactions(userId: string, query: ListTransactionsQuery) {
    const conditions = [eq(transactions.userId, userId), isNull(transactions.archivedAt)];
    if (query.type) conditions.push(eq(transactions.type, query.type));
    if (query.categoryId) conditions.push(eq(transactions.categoryId, query.categoryId));
    if (query.customerId) conditions.push(eq(transactions.customerId, query.customerId));
    if (query.startDate) conditions.push(gte(transactions.transactionDate, query.startDate));
    if (query.endDate) conditions.push(lte(transactions.transactionDate, query.endDate));

    const whereClause = and(...conditions);
    const offset = (query.page - 1) * query.limit;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(transactions)
        .where(whereClause)
        .orderBy(desc(transactions.transactionDate))
        .limit(query.limit)
        .offset(offset),
      this.db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(whereClause),
    ]);

    return {
      rows: rows.map(serializeTransaction),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async getTransactionById(userId: string, transactionId: string) {
    const [transaction] = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId),
          isNull(transactions.archivedAt),
        ),
      )
      .limit(1);

    if (!transaction) {
      throw new NotFoundError("Transaction");
    }

    return serializeTransaction(transaction);
  }

  async createTransaction(userId: string, input: CreateTransactionInput) {
    await this.ensureCategoryForUser(userId, input.categoryId, input.type);
    await this.ensureCustomerForUser(userId, input.customerId ?? null);

    const [transaction] = await this.db
      .insert(transactions)
      .values({
        userId,
        customerId: input.customerId ?? null,
        categoryId: input.categoryId,
        type: input.type,
        amount: toMinorUnits(input.amount, input.currency),
        currency: input.currency,
        description: input.description ?? null,
        reference: input.reference ?? null,
        importHash: input.importHash ?? null,
        transactionDate: input.transactionDate,
      })
      .returning();

    return serializeTransaction(transaction);
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    input: UpdateTransactionInput,
  ) {
    const [existing] = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId),
          isNull(transactions.archivedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Transaction");
    }

    const effectiveType = input.type ?? existing.type;
    const effectiveCategoryId = input.categoryId ?? existing.categoryId;
    const effectiveCurrency = input.currency ?? existing.currency;
    const effectiveCustomerId =
      input.customerId === undefined ? existing.customerId : input.customerId;

    await this.ensureCategoryForUser(userId, effectiveCategoryId, effectiveType);
    await this.ensureCustomerForUser(userId, effectiveCustomerId ?? null);

    const [updated] = await this.db
      .update(transactions)
      .set({
        customerId: effectiveCustomerId ?? null,
        categoryId: effectiveCategoryId,
        type: effectiveType,
        amount:
          input.amount !== undefined
            ? toMinorUnits(input.amount, effectiveCurrency)
            : existing.amount,
        currency: effectiveCurrency,
        description: input.description === undefined ? existing.description : input.description,
        reference: input.reference === undefined ? existing.reference : input.reference,
        importHash: input.importHash === undefined ? existing.importHash : input.importHash,
        transactionDate: input.transactionDate ?? existing.transactionDate,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId))
      .returning();

    return serializeTransaction(updated);
  }

  async deleteTransaction(userId: string, transactionId: string) {
    const now = new Date();
    const [deleted] = await this.db
      .update(transactions)
      .set({
        archivedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId),
          isNull(transactions.archivedAt),
        ),
      )
      .returning({ id: transactions.id });

    if (!deleted) {
      throw new NotFoundError("Transaction");
    }

    return { message: "Transaction archived successfully." };
  }

  async importTransactions(userId: string, input: ImportTransactionsInput) {
    const created: Array<Awaited<ReturnType<TransactionsService["createTransaction"]>>> = [];
    for (let i = 0; i < input.items.length; i += 1) {
      const item = input.items[i];
      const imported = await this.createTransaction(userId, {
        ...item,
        transactionDate: new Date(item.transactionDate),
        importHash: item.importHash ?? `import-${Date.now()}-${i}`,
      });
      created.push(imported);
    }

    return {
      importedCount: created.length,
      items: created,
    };
  }

  async enqueueImport(userId: string, input: ImportTransactionsInput) {
    const job = await this.enqueueImportJob({
      userId,
      items: input.items.map((item) => ({
        ...item,
        transactionDate: item.transactionDate,
      })),
    });

    return {
      jobId: job.id,
      message: "Transaction import queued.",
    };
  }
}

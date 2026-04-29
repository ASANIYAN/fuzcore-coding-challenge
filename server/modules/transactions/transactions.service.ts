import { createHash } from "node:crypto";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors";
import { toDecimal, toMinorUnits } from "../../lib/currency";
import { enqueueTransactionImportJob } from "../../lib/queue";
import {
  categories,
  customers,
  importJobs,
  transactions,
} from "../../../shared/schema";
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from "./transactions.schema";

type Db = typeof db;
type TransactionRow = typeof transactions.$inferSelect;

type TransactionsServiceDeps = {
  db: Db;
  enqueueImportJob: typeof enqueueTransactionImportJob;
};

type CsvRow = {
  rowNumber: number;
  category: string;
  amount: string;
  currency: string;
  customerEmail: string | null;
  description: string | null;
  reference: string | null;
  transactionDate: string;
};

type ImportError = { row: number; reason: string };

function serializeTransaction(row: TransactionRow) {
  const { importHash: _importHash, ...rest } = row;
  return {
    ...rest,
    amount: toDecimal(rest.amount, rest.currency),
  };
}

function parseCsvDocument(content: string): { rows: string[][]; malformed: boolean } {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      currentRow.push(currentField.trim());
      const hasData = currentRow.some((value) => value.length > 0);
      if (hasData) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    return { rows, malformed: true };
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    const hasData = currentRow.some((value) => value.length > 0);
    if (hasData) {
      rows.push(currentRow);
    }
  }

  return { rows, malformed: false };
}

function parseCategoryReference(value: string): { type: "income" | "expense"; name: string } | null {
  const [rawType, ...rest] = value.split(":");
  const type = rawType?.trim();
  const name = rest.join(":").trim();
  if (!type || !name) {
    return null;
  }
  if (type !== "income" && type !== "expense") {
    return null;
  }
  return { type, name };
}

export class TransactionsService {
  private readonly db: Db;
  private readonly enqueueImportJob: typeof enqueueTransactionImportJob;

  constructor(deps?: Partial<TransactionsServiceDeps>) {
    this.db = deps?.db ?? db;
    this.enqueueImportJob = deps?.enqueueImportJob ?? enqueueTransactionImportJob;
  }

  private async resolveCategoryForUser(userId: string, categoryId: string) {
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

    return category;
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
          isNull(customers.archivedAt),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new BadRequestError("Invalid customer for this user");
    }
  }

  private parseCsvContent(csvContent: string): { rows: CsvRow[]; errors: ImportError[] } {
    const parsed = parseCsvDocument(csvContent);
    if (parsed.malformed) {
      return {
        rows: [],
        errors: [{ row: 1, reason: "Malformed CSV: unclosed quoted value" }],
      };
    }

    const rowsRaw = parsed.rows;
    if (rowsRaw.length < 2) {
      return {
        rows: [],
        errors: [{ row: 1, reason: "CSV must include header and at least one data row" }],
      };
    }

    const header = rowsRaw[0];
    const expectedHeader = [
      "category",
      "amount",
      "currency",
      "customerEmail",
      "description",
      "reference",
      "transactionDate",
    ];

    if (header.join(",") !== expectedHeader.join(",")) {
      return {
        rows: [],
        errors: [
          {
            row: 1,
            reason:
              "Invalid CSV header. Expected: category,amount,currency,customerEmail,description,reference,transactionDate",
          },
        ],
      };
    }

    const rows: CsvRow[] = [];
    const errors: ImportError[] = [];

    for (let i = 1; i < rowsRaw.length; i += 1) {
      const raw = rowsRaw[i];
      if (raw.length !== expectedHeader.length) {
        errors.push({ row: i + 1, reason: "Invalid number of columns" });
        continue;
      }

      const [category, amount, currency, customerEmail, description, reference, transactionDate] = raw;

      if (!category) {
        errors.push({ row: i + 1, reason: "Missing category" });
        continue;
      }
      if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
        errors.push({ row: i + 1, reason: "Invalid amount" });
        continue;
      }
      if (!currency || !/^[A-Z]{3}$/.test(currency)) {
        errors.push({ row: i + 1, reason: "Invalid currency code" });
        continue;
      }
      if (!transactionDate || Number.isNaN(new Date(transactionDate).getTime())) {
        errors.push({ row: i + 1, reason: "Missing or invalid transactionDate" });
        continue;
      }

      rows.push({
        rowNumber: i + 1,
        category,
        amount,
        currency,
        customerEmail: customerEmail || null,
        description: description || null,
        reference: reference || null,
        transactionDate,
      });
    }

    return { rows, errors };
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
    const category = await this.resolveCategoryForUser(userId, input.categoryId);
    await this.ensureCustomerForUser(userId, input.customerId ?? null);

    const [transaction] = await this.db
      .insert(transactions)
      .values({
        userId,
        customerId: input.customerId ?? null,
        categoryId: input.categoryId,
        type: category.type,
        amount: toMinorUnits(input.amount, input.currency),
        currency: input.currency,
        description: input.description ?? null,
        reference: input.reference ?? null,
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

    const effectiveCategoryId = input.categoryId ?? existing.categoryId;
    const effectiveCurrency = input.currency ?? existing.currency;
    const effectiveCustomerId =
      input.customerId === undefined ? existing.customerId : input.customerId;
    const effectiveCategory = await this.resolveCategoryForUser(userId, effectiveCategoryId);

    await this.ensureCustomerForUser(userId, effectiveCustomerId ?? null);

    const [updated] = await this.db
      .update(transactions)
      .set({
        customerId: effectiveCustomerId ?? null,
        categoryId: effectiveCategoryId,
        type: effectiveCategory.type,
        amount:
          input.amount !== undefined
            ? toMinorUnits(input.amount, effectiveCurrency)
            : existing.amount,
        currency: effectiveCurrency,
        description: input.description === undefined ? existing.description : input.description,
        reference: input.reference === undefined ? existing.reference : input.reference,
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

    return { message: "Transaction deleted successfully." };
  }

  async enqueueImport(userId: string, csvContent: string) {
    const [activeJob] = await this.db
      .select({ id: importJobs.id })
      .from(importJobs)
      .where(
        and(
          eq(importJobs.userId, userId),
          inArray(importJobs.status, ["pending", "processing"]),
        ),
      )
      .limit(1);

    if (activeJob) {
      throw new ConflictError(
        "An import is already in progress. Please wait for it to complete before uploading another file.",
      );
    }

    const [jobRecord] = await this.db
      .insert(importJobs)
      .values({ userId, status: "pending" })
      .returning({ id: importJobs.id });

    await this.enqueueImportJob({
      jobId: jobRecord.id,
      userId,
      csvContent,
    });

    return {
      jobId: jobRecord.id,
      message: "Transaction import queued.",
    };
  }

  async getImportStatus(userId: string, jobId: string) {
    const [job] = await this.db
      .select()
      .from(importJobs)
      .where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)))
      .limit(1);

    if (!job) {
      throw new NotFoundError("Import job");
    }

    return {
      jobId: job.id,
      status: job.status,
      totalRows: job.totalRows,
      importedRows: job.importedRows,
      duplicateRows: job.duplicateRows,
      failedRows: job.failedRows,
      errors: job.errors ?? [],
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  async processCsvImportJob(userId: string, jobId: string, csvContent: string) {
    const parsed = this.parseCsvContent(csvContent);
    const now = new Date();

    await this.db
      .update(importJobs)
      .set({
        status: "processing",
        startedAt: now,
        totalRows: parsed.rows.length,
      })
      .where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)));

    const errors: ImportError[] = [...parsed.errors];

    const candidates = parsed.rows
      .map((row) => ({ rowNumber: row.rowNumber, row }))
      .filter(({ rowNumber, row }) => {
        if (!parseCategoryReference(row.category)) {
          errors.push({ row: rowNumber, reason: `Invalid category reference '${row.category}'` });
          return false;
        }
        return true;
      });

    const categoryRefs = candidates.map(({ row }) => parseCategoryReference(row.category)!);
    const uniqueCategoryNames = Array.from(new Set(categoryRefs.map((ref) => ref.name)));
    const uniqueCategoryTypes = Array.from(new Set(categoryRefs.map((ref) => ref.type)));

    const categoryRows =
      uniqueCategoryNames.length > 0
        ? await this.db
            .select({ id: categories.id, name: categories.name, type: categories.type })
            .from(categories)
            .where(
              and(
                eq(categories.userId, userId),
                isNull(categories.archivedAt),
                inArray(categories.name, uniqueCategoryNames),
                inArray(categories.type, uniqueCategoryTypes),
              ),
            )
        : [];

    const categoryMap = new Map(categoryRows.map((c) => [`${c.type}:${c.name}`, c]));

    const customerEmails = Array.from(
      new Set(
        candidates
          .map(({ row }) => row.customerEmail?.trim().toLowerCase())
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const customerRows =
      customerEmails.length > 0
        ? await this.db
            .select({ id: customers.id, email: customers.email })
            .from(customers)
            .where(
              and(
                eq(customers.userId, userId),
                isNull(customers.archivedAt),
                inArray(customers.email, customerEmails),
              ),
            )
        : [];

    const customerMap = new Map(
      customerRows
        .filter((row) => row.email)
        .map((row) => [String(row.email).toLowerCase(), row.id]),
    );

    const prepared = candidates
      .map(({ rowNumber, row }) => {
        const categoryRef = parseCategoryReference(row.category)!;
        const category = categoryMap.get(`${categoryRef.type}:${categoryRef.name}`);
        if (!category) {
          errors.push({ row: rowNumber, reason: `Category '${row.category}' not found` });
          return null;
        }

        const customerEmail = row.customerEmail?.trim().toLowerCase() ?? null;
        const customerId = customerEmail ? customerMap.get(customerEmail) : null;
        if (customerEmail && !customerId) {
          errors.push({ row: rowNumber, reason: `Customer email '${customerEmail}' not found` });
          return null;
        }

        const amountValue = Number(row.amount);
        if (!Number.isFinite(amountValue) || amountValue <= 0) {
          errors.push({ row: rowNumber, reason: "Invalid amount" });
          return null;
        }

        const transactionDate = new Date(row.transactionDate);
        if (Number.isNaN(transactionDate.getTime())) {
          errors.push({ row: rowNumber, reason: "Missing transactionDate" });
          return null;
        }

        const importHash = createHash("sha256")
          .update(
            [
              amountValue.toString(),
              row.currency,
              transactionDate.toISOString(),
              row.description ?? "",
              row.reference ?? "",
            ].join("|"),
          )
          .digest("hex");

        return {
          rowNumber,
          userId,
          customerId: customerId ?? null,
          categoryId: category.id,
          type: category.type,
          amount: toMinorUnits(amountValue, row.currency),
          currency: row.currency,
          description: row.description,
          reference: row.reference,
          transactionDate,
          importHash,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);

    const hashes = prepared.map((row) => row.importHash);
    const existingHashes =
      hashes.length > 0
        ? await this.db
            .select({ importHash: transactions.importHash })
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                inArray(transactions.importHash, hashes),
                isNull(transactions.archivedAt),
              ),
            )
        : [];

    const existingHashSet = new Set(
      existingHashes
        .map((row) => row.importHash)
        .filter((hash): hash is string => typeof hash === "string"),
    );

    const deduped = prepared.filter((row) => {
      if (existingHashSet.has(row.importHash)) {
        errors.push({ row: row.rowNumber, reason: "Duplicate transaction skipped" });
        return false;
      }
      return true;
    });

    if (deduped.length > 0) {
      await this.db.insert(transactions).values(
        deduped.map((row) => ({
          userId: row.userId,
          customerId: row.customerId,
          categoryId: row.categoryId,
          type: row.type,
          amount: row.amount,
          currency: row.currency,
          description: row.description,
          reference: row.reference,
          transactionDate: row.transactionDate,
          importHash: row.importHash,
        })),
      );
    }

    const completedAt = new Date();
    const duplicateRows = errors.filter((error) => error.reason === "Duplicate transaction skipped").length;
    const failedRows = errors.length - duplicateRows;
    const importedRows = deduped.length;

    await this.db
      .update(importJobs)
      .set({
        status: "completed",
        importedRows,
        duplicateRows,
        failedRows,
        errors,
        completedAt,
      })
      .where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)));

    return {
      importedRows,
      duplicateRows,
      failedRows,
      errors,
    };
  }

  async failImportJob(userId: string, jobId: string, reason: string) {
    await this.db
      .update(importJobs)
      .set({
        status: "failed",
        errors: [{ row: 0, reason }],
        completedAt: new Date(),
      })
      .where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)));
  }
}

import type { Request, Response } from "express";
import { ValidationError } from "../../lib/errors";
import { paginated } from "../../lib/response";
import type { TransactionsService } from "./transactions.service";
import {
  createTransactionSchema,
  importJobIdParamSchema,
  listTransactionsQuerySchema,
  transactionIdParamSchema,
  type CreateTransactionInput,
  type ImportJobIdParam,
  type TransactionIdParam,
  type UpdateTransactionInput,
  updateTransactionSchema,
} from "./transactions.schema";

export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  listTransactions = async (req: Request, res: Response) => {
    const queryResult = listTransactionsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError(queryResult.error.issues);
    }

    const { rows, total } = await this.transactionsService.listTransactions(
      req.user!.id,
      queryResult.data,
    );

    return res
      .status(200)
      .json(paginated(rows, total, queryResult.data.page, queryResult.data.limit));
  };

  getTransaction = async (req: Request<TransactionIdParam>, res: Response) => {
    const paramsResult = transactionIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const transaction = await this.transactionsService.getTransactionById(
      req.user!.id,
      paramsResult.data.id,
    );
    return res.status(200).json({
      success: true as const,
      data: transaction,
    });
  };

  createTransaction = async (
    req: Request<unknown, unknown, CreateTransactionInput>,
    res: Response,
  ) => {
    const bodyResult = createTransactionSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const transaction = await this.transactionsService.createTransaction(
      req.user!.id,
      bodyResult.data,
    );
    return res.status(201).json({
      success: true as const,
      data: transaction,
    });
  };

  updateTransaction = async (
    req: Request<TransactionIdParam, unknown, UpdateTransactionInput>,
    res: Response,
  ) => {
    const paramsResult = transactionIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }
    const bodyResult = updateTransactionSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const transaction = await this.transactionsService.updateTransaction(
      req.user!.id,
      paramsResult.data.id,
      bodyResult.data,
    );
    return res.status(200).json({
      success: true as const,
      data: transaction,
    });
  };

  deleteTransaction = async (req: Request<TransactionIdParam>, res: Response) => {
    const paramsResult = transactionIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const result = await this.transactionsService.deleteTransaction(
      req.user!.id,
      paramsResult.data.id,
    );
    return res.status(200).json({
      success: true as const,
      data: result,
    });
  };

  queueImportTransactions = async (req: Request, res: Response) => {
    if (!req.uploadedCsv) {
      throw new ValidationError([
        {
          path: ["file"],
          message: "CSV file is required",
        },
      ]);
    }

    const result = await this.transactionsService.enqueueImport(
      req.user!.id,
      req.uploadedCsv.content,
    );

    return res.status(202).json({
      success: true as const,
      data: result,
    });
  };

  getImportStatus = async (req: Request<ImportJobIdParam>, res: Response) => {
    const paramsResult = importJobIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const result = await this.transactionsService.getImportStatus(
      req.user!.id,
      paramsResult.data.jobId,
    );

    return res.status(200).json({
      success: true as const,
      data: result,
    });
  };

  downloadSampleCsv = async (_req: Request, res: Response) => {
    const csv = [
      "category,amount,currency,customerEmail,description,reference,transactionDate",
      "income:Consulting,1500.00,NGN,,Consulting fee for March,INV-0001,2024-01-15",
      "expense:Office Supplies,250.00,USD,,Office supplies purchase,REC-0042,2024-01-16",
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="transactions-sample.csv"');
    return res.status(200).send(csv);
  };
}

import type { Request, Response } from "express";
import { ValidationError } from "../../lib/errors";
import { paginated, success } from "../../lib/response";
import type { TransactionsService } from "./transactions.service";
import {
  createTransactionSchema,
  importTransactionsSchema,
  listTransactionsQuerySchema,
  transactionIdParamSchema,
  type CreateTransactionInput,
  type ImportTransactionsInput,
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
    return res.status(200).json(success(transaction));
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
    return res.status(201).json(success(transaction));
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
    return res.status(200).json(success(transaction));
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
    return res.status(200).json(success(result));
  };

  importTransactions = async (
    req: Request<unknown, unknown, ImportTransactionsInput>,
    res: Response,
  ) => {
    const bodyResult = importTransactionsSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const result = await this.transactionsService.importTransactions(
      req.user!.id,
      bodyResult.data,
    );
    return res.status(201).json(success(result));
  };

  queueImportTransactions = async (
    req: Request<unknown, unknown, ImportTransactionsInput>,
    res: Response,
  ) => {
    const bodyResult = importTransactionsSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const result = await this.transactionsService.enqueueImport(
      req.user!.id,
      bodyResult.data,
    );
    return res.status(202).json(success(result));
  };
}

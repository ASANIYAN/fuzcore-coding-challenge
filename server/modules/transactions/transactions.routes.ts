import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "./transactions.schema";

const transactionsService = new TransactionsService();
const transactionsController = new TransactionsController(transactionsService);

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

transactionsRouter.get("/", transactionsController.listTransactions);
transactionsRouter.get("/:id", transactionsController.getTransaction);
transactionsRouter.post(
  "/",
  validate(createTransactionSchema),
  transactionsController.createTransaction,
);
transactionsRouter.patch(
  "/:id",
  validate(updateTransactionSchema),
  transactionsController.updateTransaction,
);
transactionsRouter.delete("/:id", transactionsController.deleteTransaction);

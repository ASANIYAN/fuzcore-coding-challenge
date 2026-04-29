import { Worker } from "bullmq";
import { logger } from "../lib/logger";
import { getRedisClient } from "../lib/redis";
import { TRANSACTION_IMPORT_QUEUE_NAME } from "../lib/queue";
import { TransactionsService } from "../modules/transactions/transactions.service";

let transactionImportWorker: Worker | null = null;

export function startTransactionImportWorker() {
  if (transactionImportWorker) {
    return transactionImportWorker;
  }

  const service = new TransactionsService();
  transactionImportWorker = new Worker(
    TRANSACTION_IMPORT_QUEUE_NAME,
    async (job) => {
      await service.importTransactions(job.data.userId, {
        items: job.data.items,
      });
      logger.info({ jobId: job.id, userId: job.data.userId }, "transaction import processed");
    },
    {
      connection: getRedisClient(),
      concurrency: 1,
    },
  );

  transactionImportWorker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        userId: job?.data?.userId,
        err: error,
      },
      "transaction import failed",
    );
  });

  return transactionImportWorker;
}

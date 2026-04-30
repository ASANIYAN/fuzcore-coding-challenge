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
      try {
        await service.processCsvImportJob(job.data.userId, job.data.jobId, job.data.csvContent);
        logger.info({ jobId: job.id, userId: job.data.userId }, "transaction import processed");
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? `Import processing failed: ${error.message}`
            : "Import processing failed";
        await service.failImportJob(job.data.userId, job.data.jobId, reason);
        throw error;
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 10,
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

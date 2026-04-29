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
  const redis = getRedisClient();
  transactionImportWorker = new Worker(
    TRANSACTION_IMPORT_QUEUE_NAME,
    async (job) => {
      const lockKey = `transaction-import-lock:${job.data.userId}`;
      const lockToken = `${job.id}-${Date.now()}`;
      let acquired = false;
      while (!acquired) {
        const result = await (redis as unknown as { set: (...args: unknown[]) => Promise<string | null> }).set(
          lockKey,
          lockToken,
          "EX",
          120,
          "NX",
        );
        acquired = result === "OK";
        if (!acquired) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      try {
        await service.importTransactions(job.data.userId, {
          items: job.data.items,
        });
        logger.info({ jobId: job.id, userId: job.data.userId }, "transaction import processed");
      } finally {
        const currentToken = await redis.get(lockKey);
        if (currentToken === lockToken) {
          await redis.del(lockKey);
        }
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

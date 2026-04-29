import { Worker } from "bullmq";
import { EMAIL_QUEUE_NAME } from "../lib/queue";
import { getRedisClient } from "../lib/redis";
import { sendMail } from "../lib/mailer";
import { logger } from "../lib/logger";

let emailWorker: Worker | null = null;

export function startEmailWorker() {
  if (emailWorker) {
    return emailWorker;
  }

  emailWorker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job) => {
      await sendMail(job.data);
      logger.info({ jobId: job.id }, "email job processed");
    },
    {
      connection: getRedisClient(),
    },
  );

  emailWorker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        invoiceId: job?.data?.invoiceId,
        attemptCount: job?.attemptsMade,
        maxAttempts: job?.opts?.attempts,
        err: error,
      },
      "email job failed",
    );
  });

  return emailWorker;
}

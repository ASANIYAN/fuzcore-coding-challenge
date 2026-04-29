import { Queue } from "bullmq";
import { getRedisClient } from "./redis";

export type EmailJobPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type TransactionImportItem = {
  category: string;
  amount: string;
  currency: string;
  customerEmail?: string;
  description?: string;
  reference?: string;
  transactionDate: string;
};

export type TransactionImportJobPayload = {
  jobId: string;
  userId: string;
  csvContent: string;
};

export const EMAIL_QUEUE_NAME = "email-jobs";
export const TRANSACTION_IMPORT_QUEUE_NAME = "transaction-import-jobs";

let emailQueue: Queue<EmailJobPayload> | null = null;
let transactionImportQueue: Queue<TransactionImportJobPayload> | null = null;

export function getEmailQueue() {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
      connection: getRedisClient(),
    });
  }

  return emailQueue;
}

export function enqueueEmailJob(payload: EmailJobPayload) {
  return getEmailQueue().add("send-email", payload, {
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 200,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });
}

export function getTransactionImportQueue() {
  if (!transactionImportQueue) {
    transactionImportQueue = new Queue<TransactionImportJobPayload>(
      TRANSACTION_IMPORT_QUEUE_NAME,
      {
        connection: getRedisClient(),
      },
    );
  }

  return transactionImportQueue;
}

export function enqueueTransactionImportJob(payload: TransactionImportJobPayload) {
  return getTransactionImportQueue().add(`import-${payload.userId}`, payload, {
    jobId: payload.jobId,
    attempts: 5,
    removeOnComplete: 100,
    removeOnFail: 200,
    backoff: {
      type: "exponential",
      delay: 1000,
      jitter: 0.5,
    },
  });
}

import { Queue } from "bullmq";
import { getRedisClient } from "./redis";

export type EmailJobPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export const EMAIL_QUEUE_NAME = "email-jobs";

let emailQueue: Queue<EmailJobPayload> | null = null;

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

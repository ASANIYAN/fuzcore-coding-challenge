import { Queue } from "bullmq";
import { getRedisClient } from "./redis";

export type EmailJobPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export const EMAIL_QUEUE_NAME = "email-jobs";

const queueConnection = getRedisClient();

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: queueConnection,
});

export function enqueueEmailJob(payload: EmailJobPayload) {
  return emailQueue.add("send-email", payload, {
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 200,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });
}

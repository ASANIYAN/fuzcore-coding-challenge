import type { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { success } from "../../lib/response";
import type { WebhooksService } from "./webhooks.service";

export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  stripe = async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    const headerValue = Array.isArray(signature) ? signature[0] : signature;
    const payload = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));

    const event = this.webhooksService.verifyStripeWebhook(payload, headerValue);

    setImmediate(() => {
      void this.webhooksService.processStripeEvent(event).catch((err) => {
        logger.error({ err }, "stripe webhook processing failed");
      });
    });

    return res.status(200).json(success({ received: true }));
  };
}

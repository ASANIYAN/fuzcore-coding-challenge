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

    logger.info(
      {
        requestId: req.requestId,
        hasSignature: Boolean(headerValue),
        payloadBytes: payload.length,
      },
      "stripe webhook request received",
    );

    const event = this.webhooksService.verifyStripeWebhook(
      payload,
      headerValue,
    );
    logger.info(
      { requestId: req.requestId, eventId: event.id, eventType: event.type },
      "stripe webhook acknowledged",
    );

    setImmediate(() => {
      void this.webhooksService.processStripeEvent(event).catch((err) => {
        logger.error(
          {
            err,
            requestId: req.requestId,
            eventId: event.id,
            eventType: event.type,
          },
          "stripe webhook processing failed",
        );
      });
    });

    return res.status(200).json(success({ received: true }));
  };
}

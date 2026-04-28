import { Router } from "express";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

const webhooksService = new WebhooksService();
const webhooksController = new WebhooksController(webhooksService);

export const webhooksRouter = Router();

webhooksRouter.post("/stripe", webhooksController.stripe);

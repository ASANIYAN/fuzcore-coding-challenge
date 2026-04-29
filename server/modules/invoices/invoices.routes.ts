import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { validate } from "../../middleware/validate.middleware";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "./invoices.schema";

const invoicesService = new InvoicesService();
const invoicesController = new InvoicesController(invoicesService);

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);
invoicesRouter.use(rateLimit("standard-user-minute"));

invoicesRouter.get("/", invoicesController.listInvoices);
invoicesRouter.get("/:id", invoicesController.getInvoice);
invoicesRouter.get(
  "/:id/pdf",
  rateLimit("moderate-user-hourly"),
  invoicesController.getInvoicePdf,
);
invoicesRouter.post("/", validate(createInvoiceSchema), invoicesController.createInvoice);
invoicesRouter.patch("/:id", validate(updateInvoiceSchema), invoicesController.updateInvoice);
invoicesRouter.post(
  "/:id/status",
  validate(updateInvoiceStatusSchema),
  invoicesController.updateStatus,
);
invoicesRouter.post(
  "/:id/payment-link",
  rateLimit("moderate-user-hourly"),
  invoicesController.createPaymentLink,
);

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
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

invoicesRouter.get("/", invoicesController.listInvoices);
invoicesRouter.get("/:id", invoicesController.getInvoice);
invoicesRouter.post("/", validate(createInvoiceSchema), invoicesController.createInvoice);
invoicesRouter.patch("/:id", validate(updateInvoiceSchema), invoicesController.updateInvoice);
invoicesRouter.post(
  "/:id/status",
  validate(updateInvoiceStatusSchema),
  invoicesController.updateStatus,
);

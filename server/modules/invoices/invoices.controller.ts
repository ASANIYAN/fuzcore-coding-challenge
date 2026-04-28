import type { Request, Response } from "express";
import { ValidationError } from "../../lib/errors";
import { paginated, success } from "../../lib/response";
import type { InvoicesService } from "./invoices.service";
import {
  createInvoiceSchema,
  invoiceIdParamSchema,
  listInvoicesQuerySchema,
  type CreateInvoiceInput,
  type InvoiceIdParam,
  type UpdateInvoiceInput,
  type UpdateInvoiceStatusInput,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "./invoices.schema";

export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  listInvoices = async (req: Request, res: Response) => {
    const queryResult = listInvoicesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError(queryResult.error.issues);
    }

    const { rows, total } = await this.invoicesService.listInvoices(
      req.user!.id,
      queryResult.data,
    );
    return res
      .status(200)
      .json(paginated(rows, total, queryResult.data.page, queryResult.data.limit));
  };

  getInvoice = async (req: Request<InvoiceIdParam>, res: Response) => {
    const paramsResult = invoiceIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const invoice = await this.invoicesService.getInvoiceById(req.user!.id, paramsResult.data.id);
    return res.status(200).json(success(invoice));
  };

  createInvoice = async (req: Request<unknown, unknown, CreateInvoiceInput>, res: Response) => {
    const bodyResult = createInvoiceSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const invoice = await this.invoicesService.createInvoice(req.user!.id, bodyResult.data);
    return res.status(201).json(success(invoice));
  };

  updateInvoice = async (
    req: Request<InvoiceIdParam, unknown, UpdateInvoiceInput>,
    res: Response,
  ) => {
    const paramsResult = invoiceIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }
    const bodyResult = updateInvoiceSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const invoice = await this.invoicesService.updateInvoice(
      req.user!.id,
      paramsResult.data.id,
      bodyResult.data,
    );
    return res.status(200).json(success(invoice));
  };

  updateStatus = async (
    req: Request<InvoiceIdParam, unknown, UpdateInvoiceStatusInput>,
    res: Response,
  ) => {
    const paramsResult = invoiceIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }
    const bodyResult = updateInvoiceStatusSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const invoice = await this.invoicesService.updateInvoiceStatus(
      req.user!.id,
      paramsResult.data.id,
      bodyResult.data,
    );
    return res.status(200).json(success(invoice));
  };
}

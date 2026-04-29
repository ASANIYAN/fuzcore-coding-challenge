import type { Request, Response } from "express";
import { ValidationError } from "../../lib/errors";
import { paginated, success } from "../../lib/response";
import { toDecimal } from "../../lib/currency";
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

  private toMinorNumber(value: unknown, currency: string) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
      return toDecimal(BigInt(value), currency);
    }
    return value;
  }

  private serializeInvoiceForResponse<T extends Record<string, unknown>>(invoice: T) {
    const currency = String(invoice.currency ?? "");
    const normalizedTaxRate =
      invoice.taxRate == null ? null : Number(invoice.taxRate);
    const items = Array.isArray(invoice.items)
      ? invoice.items.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            ...row,
            unitPrice: this.toMinorNumber(row.unitPrice, currency),
          };
        })
      : invoice.items;

    return {
      ...invoice,
      taxRate: normalizedTaxRate,
      items,
      subtotal: this.toMinorNumber(invoice.subtotal, currency),
      taxAmount: this.toMinorNumber(invoice.taxAmount, currency),
      total: this.toMinorNumber(invoice.total, currency),
    };
  }

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
      .json(
        paginated(
          rows.map((row) => this.serializeInvoiceForResponse(row)),
          total,
          queryResult.data.page,
          queryResult.data.limit,
        ),
      );
  };

  getInvoice = async (req: Request<InvoiceIdParam>, res: Response) => {
    const paramsResult = invoiceIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const invoice = await this.invoicesService.getInvoiceById(req.user!.id, paramsResult.data.id);
    return res.status(200).json(success(this.serializeInvoiceForResponse(invoice)));
  };

  createInvoice = async (req: Request<unknown, unknown, CreateInvoiceInput>, res: Response) => {
    const bodyResult = createInvoiceSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const invoice = await this.invoicesService.createInvoice(req.user!.id, bodyResult.data);
    return res.status(201).json(success(this.serializeInvoiceForResponse(invoice)));
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
    return res.status(200).json(success(this.serializeInvoiceForResponse(invoice)));
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
    return res.status(200).json(success(this.serializeInvoiceForResponse(invoice)));
  };

  createPaymentLink = async (req: Request<InvoiceIdParam>, res: Response) => {
    const paramsResult = invoiceIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const data = await this.invoicesService.createInvoicePaymentLink(
      req.user!.id,
      paramsResult.data.id,
    );

    return res.status(200).json(success(data));
  };

  getInvoicePdf = async (req: Request<InvoiceIdParam>, res: Response) => {
    const paramsResult = invoiceIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const pdf = await this.invoicesService.getInvoicePdf(req.user!.id, paramsResult.data.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${pdf.fileName}\"`);
    return res.status(200).send(pdf.buffer);
  };
}

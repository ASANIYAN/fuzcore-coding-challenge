import { z } from "zod";
import { isSupportedCurrency } from "../../lib/currency";

const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/)
  .refine((value) => isSupportedCurrency(value), {
    message: "Unsupported currency",
  });

export const invoiceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "sent", "paid", "void"]).optional(),
  customerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const invoiceItemInputSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  sortOrder: z.number().int().min(0),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  currency: currencySchema,
  taxRate: z.number().min(0).max(100).optional().nullable(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  items: z.array(invoiceItemInputSchema).min(1),
});

export const updateInvoiceSchema = z
  .object({
    customerId: z.string().uuid().optional(),
    taxRate: z.number().min(0).max(100).optional().nullable(),
    issueDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    items: z.array(invoiceItemInputSchema).min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(["sent", "paid", "void"]),
});

export const createPaymentLinkSchema = z.object({});

export type InvoiceIdParam = z.infer<typeof invoiceIdParamSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;

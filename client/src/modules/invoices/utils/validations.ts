import { z } from "zod";
import { amountInputSchema } from "@/lib/amount-input";

const nullableTrimmedString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) {
      return null;
    }
    return value;
  });

export const invoiceStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
] as const;

export const listInvoicesQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "sent", "paid", "void"]).optional(),
  customerId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const invoiceItemFormSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  unitPrice: amountInputSchema("Unit price"),
  sortOrder: z.coerce.number().int().min(0),
});

export const invoiceFormSchema = z.object({
  customerId: z.string().uuid("Please select a customer"),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code"),
  taxRate: z.coerce.number().min(0).max(100).optional().nullable(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional().nullable(),
  notes: nullableTrimmedString,
  items: z.array(invoiceItemFormSchema).min(1, "At least one item is required"),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type InvoiceFormValues = z.input<typeof invoiceFormSchema>;
export type CreateInvoicePayload = {
  customerId: string;
  currency: string;
  taxRate: number | null;
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    sortOrder: number;
  }>;
};

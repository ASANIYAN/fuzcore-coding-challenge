import { z } from "zod";

const currencySchema = z.string().trim().regex(/^[A-Z]{3}$/);

export const transactionIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["income", "expense"]).optional(),
  categoryId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const createTransactionSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  currency: currencySchema,
  description: z.string().trim().optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  transactionDate: z.coerce.date(),
});

export const updateTransactionSchema = z
  .object({
    customerId: z.string().uuid().optional().nullable(),
    categoryId: z.string().uuid().optional(),
    amount: z.number().positive().optional(),
    currency: currencySchema.optional(),
    description: z.string().trim().optional().nullable(),
    reference: z.string().trim().optional().nullable(),
    transactionDate: z.coerce.date().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const importJobIdParamSchema = z.object({
  jobId: z.string().uuid(),
});

export type TransactionIdParam = z.infer<typeof transactionIdParamSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ImportJobIdParam = z.infer<typeof importJobIdParamSchema>;

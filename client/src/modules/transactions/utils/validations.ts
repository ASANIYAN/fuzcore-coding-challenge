import { z } from "zod";
import { amountInputSchema } from "@/lib/amount-input";

export const transactionTypeOptions = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const;

const optionalTrimmed = z
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

const currencyCode = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code");
const todayDateString = () => new Date().toISOString().slice(0, 10);

export const listTransactionsQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  type: z.enum(["income", "expense"]).optional(),
  categoryId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const transactionFormSchema = z.object({
  customerId: z.string().uuid("Please select a customer"),
  categoryId: z.string().uuid("Please select a category"),
  amount: amountInputSchema("Amount"),
  currency: currencyCode,
  description: optionalTrimmed,
  reference: optionalTrimmed,
  transactionDate: z
    .string()
    .min(1, "Transaction date is required")
    .refine((value) => value <= todayDateString(), {
      message: "Transaction date cannot be in the future",
    }),
  transactionTime: z
    .string()
    .regex(/^\d{2}:\d{2} (AM|PM)$/, "Transaction time is required"),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type TransactionFormValues = z.input<typeof transactionFormSchema>;
export type CreateTransactionPayload = {
  customerId: string;
  categoryId: string;
  amount: number;
  currency: string;
  description: string | null;
  reference: string | null;
  transactionDate: string;
};

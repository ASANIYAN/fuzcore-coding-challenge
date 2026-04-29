import { z } from "zod";

export const categoryTypeOptions = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const;

export const listCategoriesQuerySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  type: z.enum(["income", "expense"]),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
});

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryPayload = z.infer<typeof createCategorySchema>;
export type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;

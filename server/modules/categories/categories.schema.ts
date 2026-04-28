import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { categories } from "../../../shared/schema";

export const categoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCategoriesQuerySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
});

export const createCategorySchema = createInsertSchema(categories)
  .pick({
    name: true,
    type: true,
  })
  .extend({
    name: z.string().trim().min(1),
  });

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1),
});

export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

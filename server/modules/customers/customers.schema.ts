import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { customers } from "../../../shared/schema";

export const customerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  type: z.enum(["person", "company"]).optional(),
});

export const createCustomerSchema = createInsertSchema(customers)
  .pick({
    displayName: true,
    companyName: true,
    type: true,
    email: true,
    phone: true,
    taxId: true,
    addressLine1: true,
    addressLine2: true,
    city: true,
    state: true,
    postalCode: true,
    country: true,
  })
  .extend({
    displayName: z.string().trim().min(1),
    companyName: z.string().trim().optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    taxId: z.string().trim().optional().nullable(),
    addressLine1: z.string().trim().optional().nullable(),
    addressLine2: z.string().trim().optional().nullable(),
    city: z.string().trim().optional().nullable(),
    state: z.string().trim().optional().nullable(),
    postalCode: z.string().trim().optional().nullable(),
    country: z.string().trim().optional().nullable(),
  });

export const updateCustomerSchema = createCustomerSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one field is required",
  },
);

export type CustomerIdParam = z.infer<typeof customerIdParamSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

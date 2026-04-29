import { z } from "zod";

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

export const customerTypeOptions = [
  { value: "company", label: "Company" },
  { value: "person", label: "Person" },
] as const;

export const listCustomersQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  type: z.enum(["person", "company"]).optional(),
});

export const createCustomerSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required"),
  type: z.enum(["person", "company"]),
  email: z.string().trim().email("Please enter a valid email address"),
  companyName: nullableTrimmedString,
  phone: nullableTrimmedString,
  taxId: nullableTrimmedString,
  addressLine1: nullableTrimmedString,
  addressLine2: nullableTrimmedString,
  city: nullableTrimmedString,
  state: nullableTrimmedString,
  postalCode: nullableTrimmedString,
  country: nullableTrimmedString,
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type CustomerFormValues = z.input<typeof createCustomerSchema>;
export type CreateCustomerPayload = z.output<typeof createCustomerSchema>;
export type UpdateCustomerPayload = z.infer<typeof updateCustomerSchema>;

import { z } from "zod";

export const dashboardQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (value) => {
    if (!value.from || !value.to) {
      return true;
    }
    return value.from <= value.to;
  },
  {
    message: "From date must be earlier than or equal to to date",
    path: ["from"],
  },
);

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

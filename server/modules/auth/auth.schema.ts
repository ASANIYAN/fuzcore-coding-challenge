import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "../../../shared/schema";

export const signupSchema = createInsertSchema(users)
  .pick({
    email: true,
  })
  .extend({
    password: z.string().min(8),
  });

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().min(4).max(10),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().min(4).max(10),
  newPassword: z.string().min(8),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

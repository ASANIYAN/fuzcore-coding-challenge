import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "./auth.schema";

const authService = new AuthService();
const authController = new AuthController(authService);

export const authRouter = Router();

authRouter.post(
  "/signup",
  rateLimit("auth-strict"),
  validate(signupSchema),
  authController.signup,
);

authRouter.post(
  "/verify-email",
  rateLimit("auth-strict"),
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

authRouter.post(
  "/login",
  rateLimit("auth-strict"),
  validate(loginSchema),
  authController.login,
);

authRouter.post("/logout", requireAuth, authController.logout);

authRouter.post(
  "/forgot-password",
  rateLimit("auth-strict"),
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

authRouter.post(
  "/reset-password",
  rateLimit("auth-strict"),
  validate(resetPasswordSchema),
  authController.resetPassword,
);

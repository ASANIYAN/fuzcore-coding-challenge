import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { signupSchema, verifyEmailSchema } from "./auth.schema";

const authService = new AuthService();
const authController = new AuthController(authService);

export const authRouter = Router();

authRouter.post(
  "/signup",
  rateLimit("auth-signup"),
  validate(signupSchema),
  authController.signup,
);

authRouter.post(
  "/verify-email",
  rateLimit("auth-verify-email"),
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

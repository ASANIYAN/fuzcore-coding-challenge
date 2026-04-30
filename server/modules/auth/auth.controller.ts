import type { Request, Response } from "express";
import { clearSessionCookie, setSessionCookie } from "../../lib/session";
import type { AuthService } from "./auth.service";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResendVerificationInput,
  ResetPasswordInput,
  SignupInput,
  VerifyEmailInput,
} from "./auth.schema";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private ok<T>(res: Response, data: T, status = 200) {
    return res.status(status).json({
      success: true as const,
      data,
    });
  }

  signup = async (req: Request<unknown, unknown, SignupInput>, res: Response) => {
    const data = await this.authService.signup(req.body);
    setSessionCookie(res, data.sessionId);
    return this.ok(
      res,
      {
        user: data.user,
        message: data.message,
      },
      201,
    );
  };

  verifyEmail = async (
    req: Request<unknown, unknown, VerifyEmailInput>,
    res: Response,
  ) => {
    const data = await this.authService.verifyEmail(req.body);
    return this.ok(res, data);
  };

  resendVerification = async (
    req: Request<unknown, unknown, ResendVerificationInput>,
    res: Response,
  ) => {
    const data = await this.authService.resendVerification(req.body);
    return this.ok(res, data);
  };

  login = async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
    const data = await this.authService.login(req.body);
    setSessionCookie(res, data.sessionId);
    return this.ok(res, {
      user: data.user,
      message: data.message,
    });
  };

  logout = async (req: Request, res: Response) => {
    if (!req.sessionId) {
      return this.ok(res, { message: "Logout successful." });
    }

    const data = await this.authService.logout(req.sessionId);
    clearSessionCookie(res);
    return this.ok(res, data);
  };

  session = async (req: Request, res: Response) => {
    return this.ok(res, {
      authenticated: Boolean(req.user),
      user: req.user ?? null,
    });
  };

  forgotPassword = async (
    req: Request<unknown, unknown, ForgotPasswordInput>,
    res: Response,
  ) => {
    const data = await this.authService.forgotPassword(req.body);
    return this.ok(res, data);
  };

  resetPassword = async (
    req: Request<unknown, unknown, ResetPasswordInput>,
    res: Response,
  ) => {
    const data = await this.authService.resetPassword(req.body);
    return this.ok(res, data);
  };
}

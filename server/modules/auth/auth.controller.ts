import type { Request, Response } from "express";
import { success } from "../../lib/response";
import { clearSessionCookie, setSessionCookie } from "../../lib/session";
import type { AuthService } from "./auth.service";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  VerifyEmailInput,
} from "./auth.schema";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  signup = async (req: Request<unknown, unknown, SignupInput>, res: Response) => {
    const data = await this.authService.signup(req.body);
    setSessionCookie(res, data.sessionId);
    return res.status(201).json(
      success({
        user: data.user,
        message: data.message,
      }),
    );
  };

  verifyEmail = async (
    req: Request<unknown, unknown, VerifyEmailInput>,
    res: Response,
  ) => {
    const data = await this.authService.verifyEmail(req.body);
    return res.status(200).json(success(data));
  };

  login = async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
    const data = await this.authService.login(req.body);
    setSessionCookie(res, data.sessionId);
    return res.status(200).json(
      success({
        user: data.user,
        message: data.message,
      }),
    );
  };

  logout = async (req: Request, res: Response) => {
    if (!req.sessionId) {
      return res.status(200).json(success({ message: "Logout successful." }));
    }

    const data = await this.authService.logout(req.sessionId);
    clearSessionCookie(res);
    return res.status(200).json(success(data));
  };

  forgotPassword = async (
    req: Request<unknown, unknown, ForgotPasswordInput>,
    res: Response,
  ) => {
    const data = await this.authService.forgotPassword(req.body);
    return res.status(200).json(success(data));
  };

  resetPassword = async (
    req: Request<unknown, unknown, ResetPasswordInput>,
    res: Response,
  ) => {
    const data = await this.authService.resetPassword(req.body);
    return res.status(200).json(success(data));
  };
}

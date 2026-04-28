import type { Request, Response } from "express";
import { success } from "../../lib/response";
import { setSessionCookie } from "../../lib/session";
import type { AuthService } from "./auth.service";
import type { SignupInput, VerifyEmailInput } from "./auth.schema";

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
}

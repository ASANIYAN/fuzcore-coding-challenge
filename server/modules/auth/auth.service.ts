import { NotImplementedError } from "../../lib/errors";
import type { SignupInput, VerifyEmailInput } from "./auth.schema";

export class AuthService {
  async signup(input: SignupInput) {
    throw new NotImplementedError(
      `Signup flow is not implemented yet for ${input.email}`,
    );
  }

  async verifyEmail(input: VerifyEmailInput) {
    throw new NotImplementedError(
      `Email verification flow is not implemented yet for ${input.email}`,
    );
  }
}

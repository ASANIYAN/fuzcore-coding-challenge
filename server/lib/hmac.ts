import crypto from "node:crypto";
import { env } from "./env";
import { AppError } from "./errors";

function getHmacSecret() {
  if (!env.HMAC_SECRET) {
    throw new AppError(
      "MISSING_HMAC_SECRET",
      "HMAC_SECRET is required for OTP hashing",
      500,
    );
  }

  return env.HMAC_SECRET;
}

export function hashOtp(code: string) {
  return crypto
    .createHmac("sha256", getHmacSecret())
    .update(code, "utf8")
    .digest("hex");
}

export function verifyOtpHash(code: string, hash: string) {
  const computedHash = hashOtp(code);
  const left = Buffer.from(computedHash, "hex");
  const right = Buffer.from(hash, "hex");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db";
import { BadRequestError, ConflictError } from "../../lib/errors";
import { hashOtp, verifyOtpHash } from "../../lib/hmac";
import { hashPassword } from "../../lib/password";
import { enqueueEmailJob } from "../../lib/queue";
import { getSessionExpiryDate } from "../../lib/session";
import type { SignupInput, VerifyEmailInput } from "./auth.schema";
import { sessions, users, verificationCodes } from "../../../shared/schema";

type Db = typeof db;

type AuthServiceDeps = {
  db: Db;
  enqueueEmail: typeof enqueueEmailJob;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class AuthService {
  private readonly db: Db;
  private readonly enqueueEmail: typeof enqueueEmailJob;

  constructor(deps?: Partial<AuthServiceDeps>) {
    this.db = deps?.db ?? db;
    this.enqueueEmail = deps?.enqueueEmail ?? enqueueEmailJob;
  }

  async signup(input: SignupInput) {
    const now = new Date();
    const email = normalizeEmail(input.email);

    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      throw new ConflictError("Email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const otpCode = generateOtpCode();
    const otpHash = hashOtp(otpCode);
    const otpExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const sessionExpiresAt = getSessionExpiryDate(now);

    const result = await this.db.transaction(async (tx) => {
      const insertedUsers = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
        })
        .returning({
          id: users.id,
          email: users.email,
          emailVerifiedAt: users.emailVerifiedAt,
        });
      const user = insertedUsers[0];

      await tx
        .update(verificationCodes)
        .set({
          supersededAt: now,
        })
        .where(
          and(
            eq(verificationCodes.userId, user.id),
            eq(verificationCodes.type, "email_verification"),
            isNull(verificationCodes.supersededAt),
            isNull(verificationCodes.usedAt),
          ),
        );

      await tx.insert(verificationCodes).values({
        userId: user.id,
        type: "email_verification",
        codeHash: otpHash,
        expiresAt: otpExpiresAt,
      });

      const insertedSessions = await tx
        .insert(sessions)
        .values({
          userId: user.id,
          expiresAt: sessionExpiresAt,
          lastActiveAt: now,
        })
        .returning({
          id: sessions.id,
        });

      return {
        user,
        sessionId: insertedSessions[0].id,
      };
    });

    await this.enqueueEmail({
      to: result.user.email,
      subject: "Verify your email",
      text: `Your verification code is ${otpCode}. It expires in 15 minutes.`,
    });

    return {
      user: result.user,
      sessionId: result.sessionId,
      message: "Signup successful. Verification code sent.",
    };
  }

  async verifyEmail(input: VerifyEmailInput) {
    const now = new Date();
    const email = normalizeEmail(input.email);

    const userRows = await this.db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      throw new BadRequestError("Invalid verification code");
    }

    const codeRows = await this.db
      .select({
        id: verificationCodes.id,
        codeHash: verificationCodes.codeHash,
      })
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.userId, user.id),
          eq(verificationCodes.type, "email_verification"),
          isNull(verificationCodes.usedAt),
          isNull(verificationCodes.supersededAt),
          gt(verificationCodes.expiresAt, now),
        ),
      )
      .orderBy(desc(verificationCodes.createdAt))
      .limit(1);

    const validCode = codeRows.find((row) => verifyOtpHash(input.code, row.codeHash));
    if (!validCode) {
      throw new BadRequestError("Invalid verification code");
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(verificationCodes)
        .set({
          usedAt: now,
        })
        .where(eq(verificationCodes.id, validCode.id));

      await tx
        .update(users)
        .set({
          emailVerifiedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
    });

    return {
      message: "Email verified successfully.",
      verified: true,
    };
  }
}

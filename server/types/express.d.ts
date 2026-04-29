import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface AuthenticatedUser {
    id: string;
    email: string;
    emailVerifiedAt: Date | null;
  }

  interface Request {
    requestId: string;
    user?: AuthenticatedUser;
    sessionId?: string;
    uploadedCsv?: {
      filename: string;
      content: string;
    };
  }
}

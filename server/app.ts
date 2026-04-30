import express from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { requestLoggingMiddleware } from "./middleware/request-logging.middleware";
import { globalErrorMiddleware } from "./middleware/error.middleware";
import { sanitizeMiddleware } from "./middleware/sanitize.middleware";
import { env } from "./lib/env";

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "");
}

export async function createApp() {
  const app = express();
  const configuredOrigin = normalizeOrigin(
    env.FRONTEND_ORIGIN ?? "http://localhost:5001",
  );
  const allowedOrigins = new Set([
    configuredOrigin,
    "http://localhost:5001",
    "http://127.0.0.1:5001",
    "https://salena-traumatic-zada.ngrok-free.dev",
  ]);

  app.set("trust proxy", true);

  app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));
  app.use(
    "/api/transactions/import",
    express.raw({ type: "multipart/form-data", limit: "2mb" }),
  );
  app.use((_req, res, next) => {
    res.setHeader("ngrok-skip-browser-warning", "true");
    next();
  });
  app.use(
    helmet({
      // Vite injects an inline React preamble in development.
      // Keep CSP strict in production, but disable it for local dev.
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (env.NODE_ENV !== "production") {
          return callback(null, true);
        }

        if (!origin) {
          return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);
        const isLocalLoopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
          normalizedOrigin,
        );
        const isNgrok = /^https:\/\/[a-z0-9-]+\.ngrok-free\.dev$/i.test(
          normalizedOrigin,
        );

        if (
          isLocalLoopback ||
          isNgrok ||
          allowedOrigins.has(normalizedOrigin)
        ) {
          return callback(null, true);
        }

        return callback(new Error("Origin not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(sanitizeMiddleware);

  await registerRoutes(app);

  app.use(globalErrorMiddleware);

  return app;
}

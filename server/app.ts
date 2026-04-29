import express from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { requestLoggingMiddleware } from "./middleware/request-logging.middleware";
import { globalErrorMiddleware } from "./middleware/error.middleware";
import { sanitizeMiddleware } from "./middleware/sanitize.middleware";
import { env } from "./lib/env";

export async function createApp() {
  const app = express();
  const allowedOrigin = env.FRONTEND_ORIGIN ?? "http://localhost:5000";

  app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));
  app.use(
    "/api/transactions/import",
    express.raw({ type: "multipart/form-data", limit: "2mb" }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type"],
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

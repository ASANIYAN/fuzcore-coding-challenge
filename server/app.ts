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
  const allowedOrigin = env.FRONTEND_ORIGIN ?? "http://localhost:5001";

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
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (env.NODE_ENV !== "production") {
          return callback(null, true);
        }

        if (!origin) {
          return callback(null, true);
        }

        if (
          origin === allowedOrigin ||
          origin === "http://localhost:5001" ||
          origin === "http://127.0.0.1:5001" ||
          origin === "https://salena-traumatic-zada.ngrok-free.dev"
        ) {
          return callback(null, true);
        }

        return callback(new Error("Origin not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "ngrok-skip-browser-warning"],
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

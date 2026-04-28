import express from "express";
import { registerRoutes } from "./routes";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { requestLoggingMiddleware } from "./middleware/request-logging.middleware";
import { globalErrorMiddleware } from "./middleware/error.middleware";
import { sanitizeMiddleware } from "./middleware/sanitize.middleware";

export async function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(sanitizeMiddleware);

  await registerRoutes(app);

  app.use(globalErrorMiddleware);

  return app;
}

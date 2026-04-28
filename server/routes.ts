import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./lib/openapi";
import { authRouter } from "./modules/auth/auth.routes";
import { counterRouter } from "./modules/counter/counter.routes";

export async function registerRoutes(app: Express) {
  app.get("/docs/openapi.json", (_req, res) => {
    return res.status(200).json(openApiDocument);
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use("/api/auth", authRouter);
  app.use("/api/counter", counterRouter);
}

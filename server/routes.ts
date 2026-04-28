import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./lib/openapi";
import { authRouter } from "./modules/auth/auth.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { counterRouter } from "./modules/counter/counter.routes";
import { customersRouter } from "./modules/customers/customers.routes";

export async function registerRoutes(app: Express) {
  app.get("/docs/openapi.json", (_req, res) => {
    return res.status(200).json(openApiDocument);
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use("/api/auth", authRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/counter", counterRouter);
  app.use("/api/customers", customersRouter);
}

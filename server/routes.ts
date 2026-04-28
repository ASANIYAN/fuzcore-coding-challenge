import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./lib/openapi";
import { authRouter } from "./modules/auth/auth.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { customersRouter } from "./modules/customers/customers.routes";
import { invoicesRouter } from "./modules/invoices/invoices.routes";
import { transactionsRouter } from "./modules/transactions/transactions.routes";

export async function registerRoutes(app: Express) {
  app.get("/docs/openapi.json", (_req, res) => {
    return res.status(200).json(openApiDocument);
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use("/api/auth", authRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/transactions", transactionsRouter);
}

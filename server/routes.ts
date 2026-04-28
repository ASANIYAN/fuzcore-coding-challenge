import type { Express } from "express";
import { counterRouter } from "./modules/counter/counter.routes";

export async function registerRoutes(app: Express) {
  app.use("/api/counter", counterRouter);
}

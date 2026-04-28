import type { Express } from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { counterRouter } from "./modules/counter/counter.routes";

export async function registerRoutes(app: Express) {
  app.use("/api/auth", authRouter);
  app.use("/api/counter", counterRouter);
}

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

const dashboardService = new DashboardService();
const dashboardController = new DashboardController(dashboardService);

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, rateLimit("standard-user-minute"));
dashboardRouter.get("/", dashboardController.getDashboard);

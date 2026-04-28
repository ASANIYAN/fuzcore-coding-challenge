import type { Request, Response } from "express";
import { ValidationError } from "../../lib/errors";
import { success } from "../../lib/response";
import { dashboardQuerySchema } from "./dashboard.schema";
import type { DashboardService } from "./dashboard.service";

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  getDashboard = async (req: Request, res: Response) => {
    const queryResult = dashboardQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError(queryResult.error.issues);
    }

    const data = await this.dashboardService.getDashboard(req.user!.id, queryResult.data);
    return res.status(200).json(success(data));
  };
}

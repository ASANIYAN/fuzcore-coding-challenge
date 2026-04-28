import type { Request, Response } from "express";
import { success } from "../../lib/response";
import type { CounterService } from "./counter.service";

export class CounterController {
  constructor(private readonly counterService: CounterService) {}

  getCounter = async (_req: Request, res: Response) => {
    const result = await this.counterService.getCounter();
    return res.status(200).json(success({ count: result.count }));
  };

  incrementCounter = async (_req: Request, res: Response) => {
    const result = await this.counterService.incrementCounter();
    return res.status(200).json(success({ count: result.count }));
  };
}

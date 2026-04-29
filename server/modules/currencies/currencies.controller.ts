import type { Request, Response } from "express";
import type { CurrenciesService } from "./currencies.service";

export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  listCurrencies = async (_req: Request, res: Response) => {
    const data = this.currenciesService.listCurrencies();
    return res.status(200).json({
      success: true as const,
      data,
    });
  };
}

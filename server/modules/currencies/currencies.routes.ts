import { Router } from "express";
import { CurrenciesController } from "./currencies.controller";
import { CurrenciesService } from "./currencies.service";

const currenciesService = new CurrenciesService();
const currenciesController = new CurrenciesController(currenciesService);

export const currenciesRouter = Router();

currenciesRouter.get("/", currenciesController.listCurrencies);

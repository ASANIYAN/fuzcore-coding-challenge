import { Router } from "express";
import { db } from "../../db";
import { CounterController } from "./counter.controller";
import { CounterService } from "./counter.service";

const counterService = new CounterService(db);
const counterController = new CounterController(counterService);

export const counterRouter = Router();

counterRouter.get("/", counterController.getCounter);
counterRouter.post("/increment", counterController.incrementCounter);

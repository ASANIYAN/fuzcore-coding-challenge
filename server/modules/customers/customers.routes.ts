import { Router } from "express";
import {
  requireAuth,
  requireVerifiedUser,
} from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { validate } from "../../middleware/validate.middleware";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { createCustomerSchema, updateCustomerSchema } from "./customers.schema";

const customersService = new CustomersService();
const customersController = new CustomersController(customersService);

export const customersRouter = Router();

customersRouter.use(
  requireAuth,
  requireVerifiedUser,
  rateLimit("standard-user-minute"),
);

customersRouter.get("/", customersController.listCustomers);
customersRouter.get("/:id", customersController.getCustomer);
customersRouter.post(
  "/",
  validate(createCustomerSchema),
  customersController.createCustomer,
);
customersRouter.patch(
  "/:id",
  validate(updateCustomerSchema),
  customersController.updateCustomer,
);
customersRouter.delete("/:id", customersController.deleteCustomer);

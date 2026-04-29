import type { Request, Response } from "express";
import { ValidationError } from "../../lib/errors";
import { paginated } from "../../lib/response";
import type { CustomersService } from "./customers.service";
import {
  createCustomerSchema,
  customerIdParamSchema,
  listCustomersQuerySchema,
  type CreateCustomerInput,
  type CustomerIdParam,
  type UpdateCustomerInput,
  updateCustomerSchema,
} from "./customers.schema";

export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  listCustomers = async (req: Request, res: Response) => {
    const queryResult = listCustomersQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError(queryResult.error.issues);
    }

    const userId = req.user!.id;
    const { rows, total } = await this.customersService.listCustomers(
      userId,
      queryResult.data,
    );

    return res
      .status(200)
      .json(paginated(rows, total, queryResult.data.page, queryResult.data.limit));
  };

  getCustomer = async (req: Request<CustomerIdParam>, res: Response) => {
    const paramsResult = customerIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const customer = await this.customersService.getCustomerById(
      req.user!.id,
      paramsResult.data.id,
    );

    return res.status(200).json({
      success: true as const,
      data: customer,
    });
  };

  createCustomer = async (req: Request<unknown, unknown, CreateCustomerInput>, res: Response) => {
    const bodyResult = createCustomerSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const customer = await this.customersService.createCustomer(req.user!.id, bodyResult.data);
    return res.status(201).json({
      success: true as const,
      data: customer,
    });
  };

  updateCustomer = async (
    req: Request<CustomerIdParam, unknown, UpdateCustomerInput>,
    res: Response,
  ) => {
    const paramsResult = customerIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }
    const bodyResult = updateCustomerSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const customer = await this.customersService.updateCustomer(
      req.user!.id,
      paramsResult.data.id,
      bodyResult.data,
    );
    return res.status(200).json({
      success: true as const,
      data: customer,
    });
  };

  deleteCustomer = async (req: Request<CustomerIdParam>, res: Response) => {
    const paramsResult = customerIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const result = await this.customersService.deleteCustomer(
      req.user!.id,
      paramsResult.data.id,
    );
    return res.status(200).json({
      success: true as const,
      data: result,
    });
  };
}

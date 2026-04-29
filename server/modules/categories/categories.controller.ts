import type { Request, Response } from "express";
import { ValidationError } from "../../lib/errors";
import type { CategoriesService } from "./categories.service";
import {
  categoryIdParamSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  type CategoryIdParam,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  updateCategorySchema,
} from "./categories.schema";

export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  listCategories = async (req: Request, res: Response) => {
    const queryResult = listCategoriesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError(queryResult.error.issues);
    }

    const categories = await this.categoriesService.listCategories(
      req.user!.id,
      queryResult.data,
    );
    return res.status(200).json({
      success: true as const,
      data: categories,
    });
  };

  getCategory = async (req: Request<CategoryIdParam>, res: Response) => {
    const paramsResult = categoryIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const category = await this.categoriesService.getCategoryById(
      req.user!.id,
      paramsResult.data.id,
    );
    return res.status(200).json({
      success: true as const,
      data: category,
    });
  };

  createCategory = async (req: Request<unknown, unknown, CreateCategoryInput>, res: Response) => {
    const bodyResult = createCategorySchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const category = await this.categoriesService.createCategory(req.user!.id, bodyResult.data);
    return res.status(201).json({
      success: true as const,
      data: category,
    });
  };

  updateCategory = async (
    req: Request<CategoryIdParam, unknown, UpdateCategoryInput>,
    res: Response,
  ) => {
    const paramsResult = categoryIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }
    const bodyResult = updateCategorySchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues);
    }

    const category = await this.categoriesService.updateCategory(
      req.user!.id,
      paramsResult.data.id,
      bodyResult.data,
    );
    return res.status(200).json({
      success: true as const,
      data: category,
    });
  };

  deleteCategory = async (req: Request<CategoryIdParam>, res: Response) => {
    const paramsResult = categoryIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues);
    }

    const result = await this.categoriesService.deleteCategory(
      req.user!.id,
      paramsResult.data.id,
    );
    return res.status(200).json({
      success: true as const,
      data: result,
    });
  };
}

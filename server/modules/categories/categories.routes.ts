import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import { createCategorySchema, updateCategorySchema } from "./categories.schema";

const categoriesService = new CategoriesService();
const categoriesController = new CategoriesController(categoriesService);

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get("/", categoriesController.listCategories);
categoriesRouter.get("/:id", categoriesController.getCategory);
categoriesRouter.post("/", validate(createCategorySchema), categoriesController.createCategory);
categoriesRouter.patch("/:id", validate(updateCategorySchema), categoriesController.updateCategory);
categoriesRouter.delete("/:id", categoriesController.deleteCategory);

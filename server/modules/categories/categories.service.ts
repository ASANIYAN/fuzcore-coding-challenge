import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { categories } from "../../../shared/schema";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "./categories.schema";

type Db = typeof db;

type CategoriesServiceDeps = {
  db: Db;
};

export class CategoriesService {
  private readonly db: Db;

  constructor(deps?: Partial<CategoriesServiceDeps>) {
    this.db = deps?.db ?? db;
  }

  async listCategories(userId: string, query: ListCategoriesQuery) {
    const conditions = [eq(categories.userId, userId), isNull(categories.archivedAt)];
    if (query.type) {
      conditions.push(eq(categories.type, query.type));
    }

    return this.db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.name));
  }

  async getCategoryById(userId: string, categoryId: string) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId),
          isNull(categories.archivedAt),
        ),
      )
      .limit(1);

    if (!category) {
      throw new NotFoundError("Category");
    }

    return category;
  }

  async createCategory(userId: string, input: CreateCategoryInput) {
    let category;
    try {
      [category] = await this.db
        .insert(categories)
        .values({
          userId,
          ...input,
        })
        .returning();
    } catch (error) {
      const dbError = error as { code?: string; constraint?: string };
      if (
        dbError.code === "23505" &&
        dbError.constraint === "categories_user_name_type_unique"
      ) {
        throw new BadRequestError(
          "A category with this name and type already exists.",
        );
      }
      throw error;
    }

    return category;
  }

  async updateCategory(userId: string, categoryId: string, input: UpdateCategoryInput) {
    let category;
    try {
      [category] = await this.db
        .update(categories)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(categories.id, categoryId),
            eq(categories.userId, userId),
            isNull(categories.archivedAt),
          ),
        )
        .returning();
    } catch (error) {
      const dbError = error as { code?: string; constraint?: string };
      if (
        dbError.code === "23505" &&
        dbError.constraint === "categories_user_name_type_unique"
      ) {
        throw new BadRequestError(
          "A category with this name and type already exists.",
        );
      }
      throw error;
    }

    if (!category) {
      throw new NotFoundError("Category");
    }

    return category;
  }

  async deleteCategory(userId: string, categoryId: string) {
    const now = new Date();
    const [category] = await this.db
      .update(categories)
      .set({
        archivedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId),
          isNull(categories.archivedAt),
        ),
      )
      .returning({
        id: categories.id,
      });

    if (!category) {
      throw new NotFoundError("Category");
    }

    return {
      message: "Category archived successfully.",
    };
  }
}

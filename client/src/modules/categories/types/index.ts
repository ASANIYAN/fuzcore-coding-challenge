export type CategoryType = "income" | "expense";

export type Category = {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type CategoriesResponse = {
  success: true;
  data: Category[];
};

export type CategoryResponse = {
  success: true;
  data: Category;
};

export type CategoryDeleteResponse = {
  success: true;
  data: {
    message: string;
  };
};

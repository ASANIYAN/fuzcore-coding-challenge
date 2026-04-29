import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import { categoriesQueryKey } from "@/modules/categories/hooks/use-categories";
import type { CategoryDeleteResponse, CategoryResponse } from "@/modules/categories/types";
import type {
  CreateCategoryPayload,
  ListCategoriesQuery,
  UpdateCategoryPayload,
} from "@/modules/categories/utils/validations";

function invalidateCategories(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["categories"] });
}

export function useCreateCategory(query: ListCategoriesQuery = {}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: CreateCategoryPayload) => {
      const response = await authApi.post<CategoryResponse>("/categories", payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateCategories(queryClient),
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey(query) }),
      ]);
    },
  });

  return {
    createCategory: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateCategory(query: ListCategoriesQuery = {}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      categoryId,
      payload,
    }: {
      categoryId: string;
      payload: UpdateCategoryPayload;
    }) => {
      const response = await authApi.patch<CategoryResponse>(`/categories/${categoryId}`, payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateCategories(queryClient),
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey(query) }),
      ]);
    },
  });

  return {
    updateCategory: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function useDeleteCategory(query: ListCategoriesQuery = {}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await authApi.delete<CategoryDeleteResponse>(`/categories/${categoryId}`);
      return { categoryId, result: response.data.data };
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateCategories(queryClient),
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey(query) }),
      ]);
    },
  });

  return {
    deleteCategory: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

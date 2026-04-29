import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import type { CategoriesResponse } from "@/modules/categories/types";
import type { ListCategoriesQuery } from "@/modules/categories/utils/validations";

export function categoriesQueryKey(query: ListCategoriesQuery) {
  return ["categories", query] as const;
}

export function useCategories(query: ListCategoriesQuery = {}) {
  const params: Record<string, string> = {};
  if (query.type) {
    params.type = query.type;
  }

  const request = useQuery({
    queryKey: categoriesQueryKey(query),
    queryFn: async () => {
      const response = await authApi.get<CategoriesResponse>("/categories", { params });
      return response.data.data;
    },
  });

  return {
    categories: request.data ?? [],
    isLoading: request.isLoading,
    isFetching: request.isFetching,
    error: request.error,
    refetch: request.refetch,
  };
}

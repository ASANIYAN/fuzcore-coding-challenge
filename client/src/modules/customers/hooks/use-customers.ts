import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import type { CustomersPaginatedResponse } from "@/modules/customers/types";
import type { ListCustomersQuery } from "@/modules/customers/utils/validations";

export function customersQueryKey(query: ListCustomersQuery) {
  return ["customers", query] as const;
}

export function useCustomers(query: ListCustomersQuery) {
  const requestParams: Record<string, string | number> = {
    page: query.page,
    limit: query.limit,
  };

  if (query.search) {
    requestParams.search = query.search;
  }
  if (query.type) {
    requestParams.type = query.type;
  }

  const request = useQuery({
    queryKey: customersQueryKey(query),
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const response = await authApi.get<CustomersPaginatedResponse>("/customers", {
        params: requestParams,
      });
      return response.data;
    },
  });

  return {
    customers: request.data?.data ?? [],
    meta: request.data?.meta ?? { page: query.page, limit: query.limit, total: 0, totalPages: 0 },
    isLoading: request.isLoading,
    isFetching: request.isFetching,
    error: request.error,
    refetch: request.refetch,
  };
}

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import type { TransactionsPaginatedResponse } from "@/modules/transactions/types";
import type { ListTransactionsQuery } from "@/modules/transactions/utils/validations";

export function transactionsQueryKey(query: ListTransactionsQuery) {
  return ["transactions", query] as const;
}

export function useTransactions(query: ListTransactionsQuery) {
  const params: Record<string, string | number> = {
    page: query.page,
    limit: query.limit,
  };

  if (query.type) params.type = query.type;
  if (query.categoryId) params.categoryId = query.categoryId;
  if (query.customerId) params.customerId = query.customerId;
  if (query.startDate) params.startDate = query.startDate;
  if (query.endDate) params.endDate = query.endDate;

  const request = useQuery({
    queryKey: transactionsQueryKey(query),
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const response = await authApi.get<TransactionsPaginatedResponse>("/transactions", {
        params,
      });
      return response.data;
    },
  });

  return {
    transactions: request.data?.data ?? [],
    meta:
      request.data?.meta ?? {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 0,
      },
    isLoading: request.isLoading,
    isFetching: request.isFetching,
    error: request.error,
    refetch: request.refetch,
  };
}

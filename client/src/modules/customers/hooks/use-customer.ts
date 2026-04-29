import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import type { CustomerResponse } from "@/modules/customers/types";

export function customerQueryKey(customerId: string) {
  return ["customer", customerId] as const;
}

export function useCustomer(customerId: string) {
  const query = useQuery({
    queryKey: customerQueryKey(customerId),
    enabled: Boolean(customerId),
    queryFn: async () => {
      const response = await authApi.get<CustomerResponse>(`/customers/${customerId}`);
      return response.data.data;
    },
  });

  return {
    customer: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

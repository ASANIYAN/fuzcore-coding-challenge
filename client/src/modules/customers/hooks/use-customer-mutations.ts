import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import { customerQueryKey } from "@/modules/customers/hooks/use-customer";
import type { CustomerDeleteResponse, CustomerResponse } from "@/modules/customers/types";
import type { CreateCustomerPayload, ListCustomersQuery, UpdateCustomerPayload } from "@/modules/customers/utils/validations";
import { customersQueryKey } from "@/modules/customers/hooks/use-customers";

function invalidateCustomers(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["customers"] });
}

export function useCreateCustomer(query: ListCustomersQuery) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: CreateCustomerPayload) => {
      const response = await authApi.post<CustomerResponse>("/customers", payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateCustomers(queryClient),
        queryClient.invalidateQueries({ queryKey: customersQueryKey(query) }),
      ]);
    },
  });

  return {
    createCustomer: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateCustomer(query: ListCustomersQuery) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      customerId,
      payload,
    }: {
      customerId: string;
      payload: UpdateCustomerPayload;
    }) => {
      const response = await authApi.patch<CustomerResponse>(`/customers/${customerId}`, payload);
      return response.data.data;
    },
    onSuccess: async (updatedCustomer) => {
      await Promise.all([
        invalidateCustomers(queryClient),
        queryClient.invalidateQueries({ queryKey: customersQueryKey(query) }),
        queryClient.invalidateQueries({ queryKey: customerQueryKey(updatedCustomer.id) }),
      ]);
    },
  });

  return {
    updateCustomer: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function useDeleteCustomer(query: ListCustomersQuery) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await authApi.delete<CustomerDeleteResponse>(`/customers/${customerId}`);
      return { customerId, result: response.data.data };
    },
    onSuccess: async ({ customerId }) => {
      await Promise.all([
        invalidateCustomers(queryClient),
        queryClient.invalidateQueries({ queryKey: customersQueryKey(query) }),
        queryClient.removeQueries({ queryKey: customerQueryKey(customerId) }),
      ]);
    },
  });

  return {
    deleteCustomer: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

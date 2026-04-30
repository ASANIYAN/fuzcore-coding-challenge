import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import { transactionsQueryKey } from "@/modules/transactions/hooks/use-transactions";
import type {
  TransactionDeleteResponse,
  TransactionResponse,
} from "@/modules/transactions/types";
import type {
  CreateTransactionPayload,
  ListTransactionsQuery,
} from "@/modules/transactions/utils/validations";

function invalidateTransactions(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["transactions"] });
}

export function useCreateTransaction(query: ListTransactionsQuery) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: CreateTransactionPayload) => {
      const response = await authApi.post<TransactionResponse>("/transactions", payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateTransactions(queryClient),
        queryClient.invalidateQueries({ queryKey: transactionsQueryKey(query) }),
      ]);
    },
  });

  return {
    createTransaction: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateTransaction(query: ListTransactionsQuery) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      transactionId,
      payload,
    }: {
      transactionId: string;
      payload: Partial<CreateTransactionPayload>;
    }) => {
      const response = await authApi.patch<TransactionResponse>(
        `/transactions/${transactionId}`,
        payload,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateTransactions(queryClient),
        queryClient.invalidateQueries({ queryKey: transactionsQueryKey(query) }),
      ]);
    },
  });

  return {
    updateTransaction: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function useDeleteTransaction(query: ListTransactionsQuery) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await authApi.delete<TransactionDeleteResponse>(
        `/transactions/${transactionId}`,
      );
      return { transactionId, result: response.data.data };
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateTransactions(queryClient),
        queryClient.invalidateQueries({ queryKey: transactionsQueryKey(query) }),
      ]);
    },
  });

  return {
    deleteTransaction: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import type { InvoicesPaginatedResponse, InvoiceResponse } from "@/modules/invoices/types";
import type { ListInvoicesQuery } from "@/modules/invoices/utils/validations";

export function invoicesQueryKey(query: ListInvoicesQuery) {
  return ["invoices", query] as const;
}

export function invoiceQueryKey(invoiceId: string) {
  return ["invoice", invoiceId] as const;
}

export function useInvoices(query: ListInvoicesQuery) {
  const params: Record<string, string | number> = {
    page: query.page,
    limit: query.limit,
  };
  if (query.status) params.status = query.status;
  if (query.customerId) params.customerId = query.customerId;
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;

  const request = useQuery({
    queryKey: invoicesQueryKey(query),
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const response = await authApi.get<InvoicesPaginatedResponse>("/invoices", { params });
      return response.data;
    },
  });

  return {
    invoices: request.data?.data ?? [],
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
  };
}

export function useInvoice(invoiceId: string) {
  const query = useQuery({
    queryKey: invoiceQueryKey(invoiceId),
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const response = await authApi.get<InvoiceResponse>(`/invoices/${invoiceId}`);
      return response.data.data;
    },
  });

  return {
    invoice: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

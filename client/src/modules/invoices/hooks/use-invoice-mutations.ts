import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import { invoiceQueryKey, invoicesQueryKey } from "@/modules/invoices/hooks/use-invoices";
import type {
  InvoiceMessageResponse,
  InvoiceResponse,
  PaymentLinkResponse,
} from "@/modules/invoices/types";
import type { CreateInvoicePayload, ListInvoicesQuery } from "@/modules/invoices/utils/validations";

function invalidateInvoices(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["invoices"] });
}

export function useCreateInvoice(query: ListInvoicesQuery) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      const response = await authApi.post<InvoiceResponse>("/invoices", payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateInvoices(queryClient),
        queryClient.invalidateQueries({ queryKey: invoicesQueryKey(query) }),
      ]);
    },
  });
  return { createInvoice: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useUpdateInvoice(query: ListInvoicesQuery) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ invoiceId, payload }: { invoiceId: string; payload: Partial<CreateInvoicePayload> }) => {
      const response = await authApi.patch<InvoiceResponse>(`/invoices/${invoiceId}`, payload);
      return response.data.data;
    },
    onSuccess: async (invoice) => {
      await Promise.all([
        invalidateInvoices(queryClient),
        queryClient.invalidateQueries({ queryKey: invoicesQueryKey(query) }),
        queryClient.invalidateQueries({ queryKey: invoiceQueryKey(invoice.id) }),
      ]);
    },
  });
  return { updateInvoice: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useUpdateInvoiceStatus(query: ListInvoicesQuery) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: "sent" | "paid" | "void" }) => {
      const response = await authApi.post<InvoiceResponse>(`/invoices/${invoiceId}/status`, { status });
      return response.data.data;
    },
    onSuccess: async (invoice) => {
      await Promise.all([
        invalidateInvoices(queryClient),
        queryClient.invalidateQueries({ queryKey: invoicesQueryKey(query) }),
        queryClient.invalidateQueries({ queryKey: invoiceQueryKey(invoice.id) }),
      ]);
    },
  });
  return { updateStatus: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useCreateInvoicePaymentLink(query: ListInvoicesQuery) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await authApi.post<PaymentLinkResponse>(`/invoices/${invoiceId}/payment-link`);
      return { invoiceId, paymentLink: response.data.data.paymentLink };
    },
    onSuccess: async ({ invoiceId }) => {
      await Promise.all([
        invalidateInvoices(queryClient),
        queryClient.invalidateQueries({ queryKey: invoicesQueryKey(query) }),
        queryClient.invalidateQueries({ queryKey: invoiceQueryKey(invoiceId) }),
      ]);
    },
  });
  return { createPaymentLink: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useResendInvoice(query: ListInvoicesQuery) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await authApi.post<InvoiceMessageResponse>(`/invoices/${invoiceId}/resend`);
      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateInvoices(queryClient),
        queryClient.invalidateQueries({ queryKey: invoicesQueryKey(query) }),
      ]);
    },
  });
  return { resendInvoice: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useDownloadInvoicePdf() {
  const mutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await authApi.get(`/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  return { downloadPdf: mutation.mutateAsync, isPending: mutation.isPending };
}

import { useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useCustomers } from "@/modules/customers/hooks/use-customers";
import { useCurrencies } from "@/modules/currencies/hooks/use-currencies";
import {
  useCreateInvoicePaymentLink,
  useDownloadInvoicePdf,
  useResendInvoice,
  useUpdateInvoice,
  useUpdateInvoiceStatus,
} from "@/modules/invoices/hooks/use-invoice-mutations";
import { useInvoice } from "@/modules/invoices/hooks/use-invoices";
import type { CreateInvoicePayload } from "@/modules/invoices/utils/validations";
import { getApiErrorMessage } from "@/lib/get-api-error-message";

const listQuery = {
  page: 1,
  limit: 20,
  status: undefined,
  customerId: undefined,
  from: undefined,
  to: undefined,
} as const;

const customerOptionsQuery = {
  page: 1,
  limit: 100,
  search: undefined,
  type: undefined,
} as const;

export function useInvoiceDetailsView() {
  const { id = "" } = useParams();
  const { invoice, isLoading, error, refetch } = useInvoice(id);
  const { customers } = useCustomers(customerOptionsQuery);
  const { currencies } = useCurrencies();

  const { updateInvoice, isPending: isUpdating } = useUpdateInvoice(listQuery);
  const { updateStatus, isPending: isUpdatingStatus } = useUpdateInvoiceStatus(listQuery);
  const { createPaymentLink, isPending: isCreatingPaymentLink } = useCreateInvoicePaymentLink(listQuery);
  const { resendInvoice, isPending: isResending } = useResendInvoice(listQuery);
  const { downloadPdf, isPending: isDownloadingPdf } = useDownloadInvoicePdf();
  const [resendBlockedUntil, setResendBlockedUntil] = useState<Date | null>(null);

  const canEdit = invoice?.status === "draft";
  const canSend = invoice?.status === "draft";
  const canMarkPaid = invoice?.status === "sent";
  const canVoid = invoice?.status === "draft" || invoice?.status === "sent";
  const canResend = invoice?.status === "sent";
  const resendBlocked =
    resendBlockedUntil !== null && resendBlockedUntil.getTime() > Date.now();

  const statusText = useMemo(() => {
    if (!invoice) return "";
    return `Status: ${invoice.status.toUpperCase()}`;
  }, [invoice]);

  const statusBadgeClass = useMemo(() => {
    if (!invoice) return "";
    if (invoice.status === "paid") return "border-status-paid-border bg-status-paid-bg text-status-paid-text";
    if (invoice.status === "sent") return "border-status-sent-border bg-status-sent-bg text-status-sent-text";
    if (invoice.status === "void") return "border-status-void-border bg-status-void-bg text-status-void-text";
    return "border-status-draft-border bg-status-draft-bg text-status-draft-text";
  }, [invoice]);

  const update = async (payload: CreateInvoicePayload) => {
    if (!invoice) return;

    await updateInvoice({
      invoiceId: invoice.id,
      payload,
    });
    await refetch();
    toast.success("Invoice updated successfully.");
  };

  const changeStatus = async (status: "sent" | "paid" | "void") => {
    if (!invoice) return;

    try {
      await updateStatus({ invoiceId: invoice.id, status });
      await refetch();
      toast.success(`Invoice marked as ${status}.`);
    } catch (statusError) {
      toast.error(getApiErrorMessage(statusError, "Unable to update invoice status"));
    }
  };

  const createPaymentLinkForInvoice = async () => {
    if (!invoice) return;

    try {
      const result = await createPaymentLink(invoice.id);
      await refetch();
      await navigator.clipboard.writeText(result.paymentLink);
      toast.success("Payment link generated and copied to clipboard.");
    } catch (paymentLinkError) {
      toast.error(getApiErrorMessage(paymentLinkError, "Unable to create payment link"));
    }
  };

  const resend = async () => {
    if (!invoice) return;

    if (resendBlocked && resendBlockedUntil) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((resendBlockedUntil.getTime() - Date.now()) / 1000),
      );
      toast.error(
        `Please wait ${remainingSeconds} seconds before resending again.`,
      );
      return;
    }

    try {
      const result = await resendInvoice(invoice.id);
      toast.success(result.message);
    } catch (resendError) {
      if (
        axios.isAxiosError(resendError) &&
        resendError.response?.status === 429
      ) {
        const retryAfterHeader = resendError.response.headers["retry-after"];
        const retryAfterSeconds =
          typeof retryAfterHeader === "string"
            ? Number.parseInt(retryAfterHeader, 10)
            : NaN;

        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
          const blockedUntil = new Date(Date.now() + retryAfterSeconds * 1000);
          setResendBlockedUntil(blockedUntil);
          toast.error(
            `Too many resend attempts. Try again in ${retryAfterSeconds} seconds.`,
          );
          return;
        }

        toast.error(
          "Too many resend attempts. Please wait a while and try again.",
        );
        return;
      }
      toast.error(getApiErrorMessage(resendError, "Unable to resend invoice"));
    }
  };

  const download = async () => {
    if (!invoice) return;

    try {
      await downloadPdf(invoice.id);
      toast.success("Invoice PDF downloaded.");
    } catch (pdfError) {
      toast.error(getApiErrorMessage(pdfError, "Unable to download PDF"));
    }
  };

  return {
    invoice,
    isLoading,
    error,
    customers,
    currencies,
    isUpdating,
    isUpdatingStatus,
    isCreatingPaymentLink,
    isResending,
    isDownloadingPdf,
    canEdit,
    canSend,
    canMarkPaid,
    canVoid,
    canResend,
    resendBlocked,
    statusText,
    statusBadgeClass,
    update,
    changeStatus,
    createPaymentLinkForInvoice,
    resend,
    download,
  };
}

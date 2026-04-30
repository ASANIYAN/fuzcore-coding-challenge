import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { CustomButton } from "@/components/custom/custom-button";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import { useCustomers } from "@/modules/customers/hooks/use-customers";
import { useCurrencies } from "@/modules/currencies/hooks/use-currencies";
import InvoiceForm from "@/modules/invoices/components/invoice-form";
import {
  useCreateInvoicePaymentLink,
  useDownloadInvoicePdf,
  useResendInvoice,
  useUpdateInvoice,
  useUpdateInvoiceStatus,
} from "@/modules/invoices/hooks/use-invoice-mutations";
import { useInvoice } from "@/modules/invoices/hooks/use-invoices";
import type { CreateInvoicePayload } from "@/modules/invoices/utils/validations";

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

export default function InvoiceDetailsView() {
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

  if (isLoading) {
    return <p className="text-xiii text-app-text-muted">Loading invoice...</p>;
  }

  if (error || !invoice) {
    return (
      <section className="space-y-4">
        <p className="text-xiii text-app-danger">
          {getApiErrorMessage(error, "Unable to load invoice")}
        </p>
        <Link to="/dashboard/invoices" className="text-xiii text-app-primary hover:underline">
          Back to invoices
        </Link>
      </section>
    );
  }

  const handleUpdate = async (payload: CreateInvoicePayload) => {
    await updateInvoice({
      invoiceId: invoice.id,
      payload,
    });
    await refetch();
    toast.success("Invoice updated successfully.");
  };

  const handleStatusChange = async (status: "sent" | "paid" | "void") => {
    try {
      await updateStatus({ invoiceId: invoice.id, status });
      await refetch();
      toast.success(`Invoice marked as ${status}.`);
    } catch (statusError) {
      toast.error(getApiErrorMessage(statusError, "Unable to update invoice status"));
    }
  };

  const handleCreatePaymentLink = async () => {
    try {
      const result = await createPaymentLink(invoice.id);
      await refetch();
      await navigator.clipboard.writeText(result.paymentLink);
      toast.success("Payment link generated and copied to clipboard.");
    } catch (paymentLinkError) {
      toast.error(getApiErrorMessage(paymentLinkError, "Unable to create payment link"));
    }
  };

  const handleResend = async () => {
    if (resendBlocked) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((resendBlockedUntil!.getTime() - Date.now()) / 1000),
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

  const handleDownloadPdf = async () => {
    try {
      await downloadPdf(invoice.id);
      toast.success("Invoice PDF downloaded.");
    } catch (pdfError) {
      toast.error(getApiErrorMessage(pdfError, "Unable to download PDF"));
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xxiv font-semibold text-app-text">Invoice #{invoice.invoiceNumber}</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xiii text-app-text-muted">{statusText}</p>
            <Badge
              variant="outline"
              className={`rounded-[--radius-full] capitalize ${statusBadgeClass}`}
            >
              {invoice.status}
            </Badge>
          </div>
        </div>
        <Link to="/dashboard/invoices" className="text-xiii text-app-primary hover:underline">
          Back to invoices
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        <CustomButton
          type="button"
          variant="secondary"
          loading={isDownloadingPdf}
          onClick={handleDownloadPdf}
        >
          Download PDF
        </CustomButton>
        {invoice.status === "sent" ? (
          <CustomButton
            type="button"
            variant="secondary"
            loading={isCreatingPaymentLink}
            onClick={handleCreatePaymentLink}
          >
            Generate payment link
          </CustomButton>
        ) : null}
        {canResend ? (
          <CustomButton
            type="button"
            variant="secondary"
            loading={isResending}
            onClick={handleResend}
            disabled={resendBlocked}
          >
            Resend invoice email
          </CustomButton>
        ) : null}
        {canSend ? (
          <CustomButton
            type="button"
            loading={isUpdatingStatus}
            onClick={() => handleStatusChange("sent")}
          >
            Mark as sent
          </CustomButton>
        ) : null}
        {canMarkPaid ? (
          <CustomButton
            type="button"
            loading={isUpdatingStatus}
            onClick={() => handleStatusChange("paid")}
          >
            Mark as paid
          </CustomButton>
        ) : null}
        {canVoid ? (
          <CustomButton
            type="button"
            variant="danger"
            loading={isUpdatingStatus}
            onClick={() => handleStatusChange("void")}
          >
            Void invoice
          </CustomButton>
        ) : null}
      </div>

      {invoice.paymentLink ? (
        <div className="rounded-[--radius-md] border border-app-border bg-app-surface p-3">
          <p className="text-xii text-app-text-muted">Payment link</p>
          <a
            href={invoice.paymentLink}
            target="_blank"
            rel="noreferrer"
            className="break-all text-xiii text-app-primary hover:underline"
          >
            {invoice.paymentLink}
          </a>
        </div>
      ) : null}

      {canEdit ? (
        <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
          <h2 className="mb-4 text-xvi font-semibold text-app-text">Edit draft invoice</h2>
          <InvoiceForm
            mode="edit"
            initialValue={invoice}
            customers={customers}
            currencies={currencies}
            isSubmitting={isUpdating}
            onSubmit={handleUpdate}
          />
        </div>
      ) : (
        <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
          <h2 className="mb-3 text-xvi font-semibold text-app-text">Invoice summary</h2>
          <div className="grid gap-1 text-xiii text-app-text-muted">
            <p>Subtotal: {invoice.currency} {invoice.subtotal.toFixed(2)}</p>
            <p>Tax ({invoice.taxRate ?? 0}%): {invoice.currency} {invoice.taxAmount.toFixed(2)}</p>
            <p className="font-medium text-app-text">Total: {invoice.currency} {invoice.total.toFixed(2)}</p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-[--radius-md] border border-app-border">
            <table className="w-full min-w-[680px] text-left text-xiii">
              <thead className="border-b border-app-border bg-app-surface text-app-text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Qty</th>
                  <th className="px-4 py-2.5 font-medium">Unit price</th>
                  <th className="px-4 py-2.5 font-medium">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {invoice.items.map((item) => {
                  const quantity = Number(item.quantity);
                  const lineTotal = quantity * item.unitPrice;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-app-text">{item.description}</td>
                      <td className="px-4 py-2.5 text-app-text-muted">{quantity}</td>
                      <td className="px-4 py-2.5 text-app-text-muted">
                        {invoice.currency} {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-app-text">
                        {invoice.currency} {lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

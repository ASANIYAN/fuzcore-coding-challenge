import { Link } from "react-router-dom";
import { CustomButton } from "@/components/custom/custom-button";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import InvoiceForm from "@/modules/invoices/components/invoice-form";
import { useInvoiceDetailsView } from "@/modules/invoices/hooks/use-invoice-details-view";

export default function InvoiceDetailsView() {
  const {
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
  } = useInvoiceDetailsView();

  if (isLoading) {
    return <p className="text-xiii text-app-text-muted">Loading invoice...</p>;
  }

  if (error || !invoice) {
    return (
      <section className="space-y-4">
        <p className="text-xiii text-app-danger">
          {getApiErrorMessage(error, "Unable to load invoice")}
        </p>
        <Link
          to="/dashboard/invoices"
          className="text-xiii text-app-text hover:underline"
        >
          Back to invoices
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xxiv font-semibold text-app-text">
            Invoice #{invoice.invoiceNumber}
          </h1>
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
        <Link
          to="/dashboard/invoices"
          className="text-xiii text-app-text hover:underline"
        >
          Back to invoices
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        <CustomButton
          type="button"
          variant="secondary"
          loading={isDownloadingPdf}
          onClick={() => void download()}
        >
          Download PDF
        </CustomButton>
        {invoice.status === "sent" ? (
          <CustomButton
            type="button"
            variant="secondary"
            loading={isCreatingPaymentLink}
            onClick={() => void createPaymentLinkForInvoice()}
          >
            Generate payment link
          </CustomButton>
        ) : null}
        {canResend ? (
          <CustomButton
            type="button"
            variant="secondary"
            loading={isResending}
            onClick={() => void resend()}
            disabled={resendBlocked}
          >
            Resend invoice email
          </CustomButton>
        ) : null}
        {canSend ? (
          <CustomButton
            type="button"
            loading={isUpdatingStatus}
            onClick={() => void changeStatus("sent")}
          >
            Mark as sent
          </CustomButton>
        ) : null}
        {canMarkPaid ? (
          <CustomButton
            type="button"
            loading={isUpdatingStatus}
            onClick={() => void changeStatus("paid")}
          >
            Mark as paid
          </CustomButton>
        ) : null}
        {canVoid ? (
          <CustomButton
            type="button"
            variant="danger"
            loading={isUpdatingStatus}
            onClick={() => void changeStatus("void")}
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
            className="break-all text-xiii text-app-text hover:underline"
          >
            {invoice.paymentLink}
          </a>
        </div>
      ) : null}

      {canEdit ? (
        <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
          <h2 className="mb-4 text-xvi font-semibold text-app-text">
            Edit draft invoice
          </h2>
          <InvoiceForm
            mode="edit"
            initialValue={invoice}
            customers={customers}
            currencies={currencies}
            isSubmitting={isUpdating}
            onSubmit={update}
          />
        </div>
      ) : (
        <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
          <h2 className="mb-3 text-xvi font-semibold text-app-text">
            Invoice summary
          </h2>
          <div className="grid gap-1 text-xiii text-app-text-muted">
            <p>
              Subtotal: {invoice.currency} {invoice.subtotal.toFixed(2)}
            </p>
            <p>
              Tax ({invoice.taxRate ?? 0}%): {invoice.currency}{" "}
              {invoice.taxAmount.toFixed(2)}
            </p>
            <p className="font-medium text-app-text">
              Total: {invoice.currency} {invoice.total.toFixed(2)}
            </p>
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
                      <td className="px-4 py-2.5 text-app-text">
                        {item.description}
                      </td>
                      <td className="px-4 py-2.5 text-app-text-muted">
                        {quantity}
                      </td>
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

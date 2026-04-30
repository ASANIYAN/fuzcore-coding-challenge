import InvoiceForm from "@/modules/invoices/components/invoice-form";
import { useInvoiceCreateView } from "@/modules/invoices/hooks/use-invoice-create-view";

export default function InvoiceCreateView() {
  const { customers, currencies, isPending, create } = useInvoiceCreateView();

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xxiv font-semibold text-app-text">Create invoice</h1>
        <p className="text-xiii text-app-text-muted">Build a draft invoice with items and tax breakdown.</p>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <InvoiceForm
          mode="create"
          customers={customers}
          currencies={currencies}
          isSubmitting={isPending}
          onSubmit={create}
        />
      </div>
    </section>
  );
}

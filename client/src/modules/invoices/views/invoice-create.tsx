import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import InvoiceForm from "@/modules/invoices/components/invoice-form";
import { useCreateInvoice } from "@/modules/invoices/hooks/use-invoice-mutations";
import { useCustomers } from "@/modules/customers/hooks/use-customers";
import { useCurrencies } from "@/modules/currencies/hooks/use-currencies";
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

export default function InvoiceCreateView() {
  const navigate = useNavigate();
  const { customers } = useCustomers(customerOptionsQuery);
  const { currencies } = useCurrencies();
  const { createInvoice, isPending } = useCreateInvoice(listQuery);

  const handleCreate = async (payload: CreateInvoicePayload) => {
    const created = await createInvoice(payload);
    toast.success("Invoice created successfully.");
    void navigate(`/dashboard/invoices/${created.id}`);
  };

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
          onSubmit={handleCreate}
        />
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
import { CustomButton } from "@/components/custom/custom-button";
import InvoicesTable from "@/modules/invoices/components/invoices-table";
import { useInvoices } from "@/modules/invoices/hooks/use-invoices";
import { invoiceStatusOptions, type ListInvoicesQuery } from "@/modules/invoices/utils/validations";
import { useCustomers } from "@/modules/customers/hooks/use-customers";

function toIsoStartOfDay(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toISOString();
}

function toIsoEndOfDay(dateString: string) {
  return new Date(`${dateString}T23:59:59.999`).toISOString();
}

const customerOptionsQuery = {
  page: 1,
  limit: 100,
  search: undefined,
  type: undefined,
} as const;

export default function InvoicesListView() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState<ListInvoicesQuery["status"]>(undefined);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const query = useMemo(
    () => ({ page, limit, status, customerId, from, to }),
    [page, limit, status, customerId, from, to],
  );

  const { invoices, meta, isLoading, isFetching } = useInvoices(query);
  const { customers } = useCustomers(customerOptionsQuery);

  const filterForm = useForm({
    defaultValues: {
      status: "all",
      customerId: "all",
      from: "",
      to: "",
    },
  });

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xxiv font-semibold text-app-text">Invoices</h1>
          <p className="text-xiii text-app-text-muted">Create, track, and manage invoice lifecycle.</p>
        </div>
        <Link to="/dashboard/invoices/new" className="text-xiii text-app-primary hover:underline">
          Create invoice
        </Link>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">Filter invoices</h2>
        <form
          onSubmit={filterForm.handleSubmit((values) => {
            setPage(1);
            setStatus(values.status === "all" ? undefined : (values.status as ListInvoicesQuery["status"]));
            setCustomerId(values.customerId === "all" ? undefined : values.customerId);
            setFrom(values.from ? toIsoStartOfDay(values.from) : undefined);
            setTo(values.to ? toIsoEndOfDay(values.to) : undefined);
          })}
          className="grid gap-4 md:grid-cols-3"
        >
          <CustomSelect
            control={filterForm.control}
            name="status"
            label="Status"
            options={[{ value: "all", label: "All" }, ...invoiceStatusOptions]}
            placeholder="All"
          />
          <CustomSelect
            control={filterForm.control}
            name="customerId"
            label="Customer"
            options={[
              { value: "all", label: "All customers" },
              ...customers.map((customer) => ({
                value: customer.id,
                label: `${customer.displayName} (${customer.email})`,
              })),
            ]}
            placeholder="All customers"
          />
          <CustomInput control={filterForm.control} name="from" label="From" type="date" />
          <CustomInput control={filterForm.control} name="to" label="To" type="date" />
          <div className="flex items-end">
            <CustomButton type="submit" loading={isFetching}>Apply filters</CustomButton>
          </div>
        </form>
      </div>

      {isLoading ? (
        <p className="text-xiii text-app-text-muted">Loading invoices...</p>
      ) : (
        <InvoicesTable invoices={invoices} customers={customers} />
      )}

      <div className="flex items-center justify-between rounded-[--radius-lg] border border-app-border bg-app-card p-4">
        <p className="text-xiii text-app-text-muted">
          Page {meta.page} of {Math.max(meta.totalPages, 1)} ({meta.total} total)
        </p>
        <div className="flex gap-2">
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </CustomButton>
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </CustomButton>
        </div>
      </div>
    </section>
  );
}

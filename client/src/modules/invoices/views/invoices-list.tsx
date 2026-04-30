import { Link } from "react-router-dom";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
import { CustomButton } from "@/components/custom/custom-button";
import InvoicesTable from "@/modules/invoices/components/invoices-table";
import { useInvoicesListView } from "@/modules/invoices/hooks/use-invoices-list-view";
import { invoiceStatusOptions, type ListInvoicesQuery } from "@/modules/invoices/utils/validations";

export default function InvoicesListView() {
  const {
    filterForm,
    invoices,
    meta,
    customers,
    isLoading,
    isFetching,
    hasPrevious,
    hasNext,
    applyFilters,
    goPrevious,
    goNext,
  } = useInvoicesListView();

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
          onSubmit={applyFilters}
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
            disabled={!hasPrevious}
            onClick={goPrevious}
          >
            Previous
          </CustomButton>
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasNext}
            onClick={goNext}
          >
            Next
          </CustomButton>
        </div>
      </div>
    </section>
  );
}

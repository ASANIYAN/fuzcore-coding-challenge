import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmActionDialog from "@/components/custom/confirm-action-dialog";
import CustomersTable from "@/modules/customers/components/customers-table";
import CustomerForm from "@/modules/customers/components/customer-form";
import { useCustomersListView } from "@/modules/customers/hooks/use-customers-list-view";
import { customerTypeOptions } from "@/modules/customers/utils/validations";

export default function CustomersListView() {
  const {
    filterForm,
    customers,
    meta,
    isLoading,
    isFetching,
    isCreating,
    isDeleting,
    deletingCustomerId,
    pendingDeleteCustomerId,
    hasPrevious,
    hasNext,
    applyFilters,
    create,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    goPrevious,
    goNext,
  } = useCustomersListView();

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xxiv font-semibold text-app-text">Customers</h1>
        <p className="text-xiii text-app-text-muted">
          Manage customer records, billing contacts, and account details.
        </p>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">
          Create customer
        </h2>
        <CustomerForm
          mode="create"
          isSubmitting={isCreating}
          onSubmit={create}
        />
      </div>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">
          Filter customers
        </h2>
        <form onSubmit={applyFilters} className="grid gap-4 md:grid-cols-3">
          <CustomInput
            control={filterForm.control}
            name="search"
            label="Search"
            placeholder="Name or email"
          />
          <CustomSelect
            control={filterForm.control}
            name="type"
            label="Type"
            options={[{ value: "all", label: "All" }, ...customerTypeOptions]}
            placeholder="All"
          />
          <div className="flex items-end">
            <CustomButton type="submit" loading={isFetching}>
              Apply filters
            </CustomButton>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className="space-y-3 rounded-[--radius-lg] border border-app-border bg-app-card p-5">
          <Skeleton className="h-5 w-56" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        </div>
      ) : (
        <CustomersTable
          customers={customers}
          deletingCustomerId={deletingCustomerId}
          onDelete={openDeleteDialog}
        />
      )}

      <div className="flex items-center justify-between rounded-[--radius-lg] border border-app-border bg-app-card p-4">
        <p className="text-xiii text-app-text-muted">
          Page {meta.page} of {Math.max(meta.totalPages, 1)} ({meta.total}{" "}
          total)
        </p>
        <div className="flex gap-2">
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasPrevious || isDeleting}
            onClick={goPrevious}
          >
            Previous
          </CustomButton>
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasNext || isDeleting}
            onClick={goNext}
          >
            Next
          </CustomButton>
        </div>
      </div>

      <ConfirmActionDialog
        open={!!pendingDeleteCustomerId}
        title="Delete customer?"
        description="This will remove the customer from active lists."
        confirmLabel="Delete customer"
        loading={isDeleting}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}

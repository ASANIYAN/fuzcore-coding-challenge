import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
import ConfirmActionDialog from "@/components/custom/confirm-action-dialog";
import CustomersTable from "@/modules/customers/components/customers-table";
import CustomerForm from "@/modules/customers/components/customer-form";
import {
  useCreateCustomer,
  useDeleteCustomer,
} from "@/modules/customers/hooks/use-customer-mutations";
import { useCustomers } from "@/modules/customers/hooks/use-customers";
import { customerTypeOptions } from "@/modules/customers/utils/validations";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import { useForm } from "react-hook-form";

export default function CustomersListView() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"person" | "company" | "">("");

  const query = useMemo(
    () => ({
      page,
      limit,
      search: search.trim() || undefined,
      type: type || undefined,
    }),
    [limit, page, search, type],
  );

  const { customers, meta, isLoading, isFetching } = useCustomers(query);
  const { createCustomer, isPending: isCreating } = useCreateCustomer(query);
  const { deleteCustomer, isPending: isDeleting } = useDeleteCustomer(query);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [pendingDeleteCustomerId, setPendingDeleteCustomerId] = useState<string | null>(null);

  const filterForm = useForm({
    defaultValues: {
      search: "",
      type: "",
    },
  });

  const handleCreate = async (payload: Parameters<typeof createCustomer>[0]) => {
    await createCustomer(payload);
    toast.success("Customer created successfully.");
  };

  const handleDelete = async (customerId: string) => {
    try {
      setDeletingCustomerId(customerId);
      await deleteCustomer(customerId);
      toast.success("Customer deleted successfully.");
      setPendingDeleteCustomerId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete customer"));
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const hasPrevious = meta.page > 1;
  const hasNext = meta.page < meta.totalPages;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xxiv font-semibold text-app-text">Customers</h1>
        <p className="text-xiii text-app-text-muted">
          Manage customer records, billing contacts, and account details.
        </p>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">Create customer</h2>
        <CustomerForm mode="create" isSubmitting={isCreating} onSubmit={handleCreate} />
      </div>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">Filter customers</h2>
        <form
          onSubmit={filterForm.handleSubmit((values) => {
            setPage(1);
            setSearch(values.search ?? "");
            setType((values.type as "person" | "company" | "") ?? "");
          })}
          className="grid gap-4 md:grid-cols-3"
        >
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
            options={[{ value: "", label: "All" }, ...customerTypeOptions]}
            placeholder="All"
          />
          <div className="flex items-end">
            <CustomButton type="submit" loading={isFetching}>Apply filters</CustomButton>
          </div>
        </form>
      </div>

      {isLoading ? (
        <p className="text-xiii text-app-text-muted">Loading customers...</p>
      ) : (
        <CustomersTable
          customers={customers}
          deletingCustomerId={deletingCustomerId}
          onDelete={setPendingDeleteCustomerId}
        />
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
            disabled={!hasPrevious || isDeleting}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </CustomButton>
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasNext || isDeleting}
            onClick={() => setPage((current) => current + 1)}
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
            setPendingDeleteCustomerId(null);
          }
        }}
        onConfirm={() => {
          if (!pendingDeleteCustomerId) {
            return;
          }
          void handleDelete(pendingDeleteCustomerId);
        }}
      />
    </section>
  );
}

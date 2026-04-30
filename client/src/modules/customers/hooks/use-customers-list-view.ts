import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useCreateCustomer,
  useDeleteCustomer,
} from "@/modules/customers/hooks/use-customer-mutations";
import { useCustomers } from "@/modules/customers/hooks/use-customers";
import { getApiErrorMessage } from "@/lib/get-api-error-message";

export function useCustomersListView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"person" | "company" | "">("");
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [pendingDeleteCustomerId, setPendingDeleteCustomerId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      search: search.trim() || undefined,
      type: type || undefined,
    }),
    [page, search, type],
  );

  const filterForm = useForm({
    defaultValues: {
      search: "",
      type: "",
    },
  });

  const { customers, meta, isLoading, isFetching } = useCustomers(query);
  const { createCustomer, isPending: isCreating } = useCreateCustomer(query);
  const { deleteCustomer, isPending: isDeleting } = useDeleteCustomer(query);

  const applyFilters = filterForm.handleSubmit((values) => {
    setPage(1);
    setSearch(values.search ?? "");
    setType((values.type as "person" | "company" | "") ?? "");
  });

  const create = async (payload: Parameters<typeof createCustomer>[0]) => {
    await createCustomer(payload);
    toast.success("Customer created successfully.");
  };

  const confirmDelete = async () => {
    if (!pendingDeleteCustomerId) return;

    try {
      setDeletingCustomerId(pendingDeleteCustomerId);
      await deleteCustomer(pendingDeleteCustomerId);
      toast.success("Customer deleted successfully.");
      setPendingDeleteCustomerId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete customer"));
    } finally {
      setDeletingCustomerId(null);
    }
  };

  return {
    filterForm,
    customers,
    meta,
    isLoading,
    isFetching,
    isCreating,
    isDeleting,
    deletingCustomerId,
    pendingDeleteCustomerId,
    hasPrevious: meta.page > 1,
    hasNext: meta.page < meta.totalPages,
    applyFilters,
    create,
    openDeleteDialog: setPendingDeleteCustomerId,
    closeDeleteDialog: () => setPendingDeleteCustomerId(null),
    confirmDelete,
    goPrevious: () => setPage((current) => Math.max(1, current - 1)),
    goNext: () => setPage((current) => current + 1),
  };
}

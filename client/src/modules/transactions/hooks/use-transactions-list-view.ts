import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCategories } from "@/modules/categories/hooks/use-categories";
import { useCustomers } from "@/modules/customers/hooks/use-customers";
import { useCurrencies } from "@/modules/currencies/hooks/use-currencies";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/modules/transactions/hooks/use-transaction-mutations";
import { useTransactions } from "@/modules/transactions/hooks/use-transactions";
import type { Transaction } from "@/modules/transactions/types";
import type {
  CreateTransactionPayload,
  ListTransactionsQuery,
} from "@/modules/transactions/utils/validations";
import { getApiErrorMessage } from "@/lib/get-api-error-message";

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

export function useTransactionsListView() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<"income" | "expense" | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [customerFilter, setCustomerFilter] = useState<string | undefined>(undefined);
  const [startDateFilter, setStartDateFilter] = useState<string | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<string | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [pendingDeleteTransactionId, setPendingDeleteTransactionId] = useState<string | null>(null);

  const query: ListTransactionsQuery = useMemo(
    () => ({
      page,
      limit: 20,
      type: typeFilter,
      categoryId: categoryFilter,
      customerId: customerFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
    }),
    [page, typeFilter, categoryFilter, customerFilter, startDateFilter, endDateFilter],
  );

  const filterForm = useForm({
    defaultValues: {
      type: "all",
      categoryId: "all",
      customerId: "all",
      startDate: "",
      endDate: "",
    },
  });

  const { categories } = useCategories({});
  const { customers } = useCustomers(customerOptionsQuery);
  const { currencies } = useCurrencies();

  const { transactions, meta, isLoading, isFetching } = useTransactions(query);
  const { createTransaction, isPending: isCreating } = useCreateTransaction(query);
  const { updateTransaction, isPending: isUpdating } = useUpdateTransaction(query);
  const { deleteTransaction } = useDeleteTransaction(query);

  const categoriesForType = typeFilter
    ? categories.filter((category) => category.type === typeFilter)
    : categories;

  const applyFilters = filterForm.handleSubmit((values) => {
    setPage(1);
    setTypeFilter(
      values.type === "all" ? undefined : (values.type as "income" | "expense"),
    );
    setCategoryFilter(values.categoryId === "all" ? undefined : values.categoryId);
    setCustomerFilter(values.customerId === "all" ? undefined : values.customerId);
    setStartDateFilter(values.startDate ? toIsoStartOfDay(values.startDate) : undefined);
    setEndDateFilter(values.endDate ? toIsoEndOfDay(values.endDate) : undefined);
  });

  const create = async (payload: CreateTransactionPayload) => {
    await createTransaction(payload);
    toast.success("Transaction created successfully.");
  };

  const update = async (payload: CreateTransactionPayload) => {
    if (!editingTransaction) return;

    await updateTransaction({
      transactionId: editingTransaction.id,
      payload,
    });
    toast.success("Transaction updated successfully.");
    setEditingTransaction(null);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteTransactionId) return;

    try {
      setDeletingTransactionId(pendingDeleteTransactionId);
      await deleteTransaction(pendingDeleteTransactionId);
      toast.success("Transaction deleted successfully.");
      if (editingTransaction?.id === pendingDeleteTransactionId) {
        setEditingTransaction(null);
      }
      setPendingDeleteTransactionId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete transaction"));
    } finally {
      setDeletingTransactionId(null);
    }
  };

  return {
    filterForm,
    categories,
    categoriesForType,
    customers,
    currencies,
    transactions,
    meta,
    editingTransaction,
    deletingTransactionId,
    pendingDeleteTransactionId,
    isLoading,
    isFetching,
    isCreating,
    isUpdating,
    hasPrevious: meta.page > 1,
    hasNext: meta.page < meta.totalPages,
    applyFilters,
    create,
    update,
    startEdit: setEditingTransaction,
    cancelEdit: () => setEditingTransaction(null),
    openDeleteDialog: setPendingDeleteTransactionId,
    closeDeleteDialog: () => setPendingDeleteTransactionId(null),
    confirmDelete,
    goPrevious: () => setPage((current) => Math.max(1, current - 1)),
    goNext: () => setPage((current) => current + 1),
  };
}

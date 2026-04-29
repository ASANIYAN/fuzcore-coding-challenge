import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
import { useCategories } from "@/modules/categories/hooks/use-categories";
import type { Category } from "@/modules/categories/types";
import { useCustomers } from "@/modules/customers/hooks/use-customers";
import { useCurrencies } from "@/modules/currencies/hooks/use-currencies";
import TransactionForm from "@/modules/transactions/components/transaction-form";
import TransactionsTable from "@/modules/transactions/components/transactions-table";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/modules/transactions/hooks/use-transaction-mutations";
import { useTransactions } from "@/modules/transactions/hooks/use-transactions";
import type { Transaction } from "@/modules/transactions/types";
import {
  transactionTypeOptions,
  type CreateTransactionPayload,
  type ListTransactionsQuery,
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

export default function TransactionsListView() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [typeFilter, setTypeFilter] = useState<"income" | "expense" | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [customerFilter, setCustomerFilter] = useState<string | undefined>(undefined);
  const [startDateFilter, setStartDateFilter] = useState<string | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<string | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  const query: ListTransactionsQuery = useMemo(
    () => ({
      page,
      limit,
      type: typeFilter,
      categoryId: categoryFilter,
      customerId: customerFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
    }),
    [page, limit, typeFilter, categoryFilter, customerFilter, startDateFilter, endDateFilter],
  );

  const { categories } = useCategories({});
  const { customers } = useCustomers(customerOptionsQuery);
  const { currencies } = useCurrencies();

  const { transactions, meta, isLoading, isFetching } = useTransactions(query);
  const { createTransaction, isPending: isCreating } = useCreateTransaction(query);
  const { updateTransaction, isPending: isUpdating } = useUpdateTransaction(query);
  const { deleteTransaction } = useDeleteTransaction(query);

  const filterForm = useForm({
    defaultValues: {
      type: "all",
      categoryId: "all",
      customerId: "all",
      startDate: "",
      endDate: "",
    },
  });

  const handleCreate = async (payload: CreateTransactionPayload) => {
    await createTransaction(payload);
    toast.success("Transaction created successfully.");
  };

  const handleUpdate = async (payload: CreateTransactionPayload) => {
    if (!editingTransaction) {
      return;
    }

    await updateTransaction({
      transactionId: editingTransaction.id,
      payload,
    });
    toast.success("Transaction updated successfully.");
    setEditingTransaction(null);
  };

  const handleDelete = async (transactionId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this transaction?");
    if (!confirmed) {
      return;
    }

    try {
      setDeletingTransactionId(transactionId);
      await deleteTransaction(transactionId);
      toast.success("Transaction deleted successfully.");
      if (editingTransaction?.id === transactionId) {
        setEditingTransaction(null);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete transaction"));
    } finally {
      setDeletingTransactionId(null);
    }
  };

  const categoriesForType = typeFilter
    ? categories.filter((category) => category.type === typeFilter)
    : categories;

  const hasPrevious = meta.page > 1;
  const hasNext = meta.page < meta.totalPages;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xxiv font-semibold text-app-text">Transactions</h1>
        <p className="text-xiii text-app-text-muted">
          Track income and expenses. Transaction type is inferred from selected category.
        </p>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">Create transaction</h2>
        <TransactionForm
          mode="create"
          categories={categories}
          customers={customers}
          currencies={currencies}
          isSubmitting={isCreating}
          onSubmit={handleCreate}
        />
      </div>

      {editingTransaction ? (
        <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xvi font-semibold text-app-text">Edit transaction</h2>
            <CustomButton type="button" size="sm" variant="secondary" onClick={() => setEditingTransaction(null)}>
              Cancel
            </CustomButton>
          </div>
          <TransactionForm
            mode="edit"
            initialValue={editingTransaction}
            categories={categories}
            customers={customers}
            currencies={currencies}
            isSubmitting={isUpdating}
            onSubmit={handleUpdate}
          />
        </div>
      ) : null}

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xvi font-semibold text-app-text">Filter transactions</h2>
          <Link to="/dashboard/transactions/import" className="text-xiii text-app-primary hover:underline">
            Go to CSV import
          </Link>
        </div>
        <form
          onSubmit={filterForm.handleSubmit((values) => {
            setPage(1);
            setTypeFilter(
              values.type === "all" ? undefined : (values.type as "income" | "expense"),
            );
            setCategoryFilter(values.categoryId === "all" ? undefined : values.categoryId);
            setCustomerFilter(values.customerId === "all" ? undefined : values.customerId);
            setStartDateFilter(values.startDate ? toIsoStartOfDay(values.startDate) : undefined);
            setEndDateFilter(values.endDate ? toIsoEndOfDay(values.endDate) : undefined);
          })}
          className="grid gap-4 md:grid-cols-3"
        >
          <CustomSelect
            control={filterForm.control}
            name="type"
            label="Type"
            options={[{ value: "all", label: "All" }, ...transactionTypeOptions]}
            placeholder="All"
          />
          <CustomSelect
            control={filterForm.control}
            name="categoryId"
            label="Category"
            options={[
              { value: "all", label: "All categories" },
              ...categoriesForType.map((category: Category) => ({
                value: category.id,
                label: `${category.name} (${category.type})`,
              })),
            ]}
            placeholder="All categories"
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
          <CustomInput control={filterForm.control} name="startDate" label="From" type="date" />
          <CustomInput control={filterForm.control} name="endDate" label="To" type="date" />
          <div className="flex items-end">
            <CustomButton type="submit" loading={isFetching}>Apply filters</CustomButton>
          </div>
        </form>
      </div>

      {isLoading ? (
        <p className="text-xiii text-app-text-muted">Loading transactions...</p>
      ) : (
        <TransactionsTable
          transactions={transactions}
          categories={categories}
          customers={customers}
          currencies={currencies}
          editingTransactionId={isUpdating && editingTransaction ? editingTransaction.id : null}
          deletingTransactionId={deletingTransactionId}
          onEdit={(transaction) => setEditingTransaction(transaction)}
          onDelete={handleDelete}
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
            disabled={!hasPrevious}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </CustomButton>
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasNext}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </CustomButton>
        </div>
      </div>
    </section>
  );
}

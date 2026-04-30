import { Link } from "react-router-dom";
import { CustomButton } from "@/components/custom/custom-button";
import ConfirmActionDialog from "@/components/custom/confirm-action-dialog";
import CustomDatePicker from "@/components/custom/custom-date-picker";
import CustomSelect from "@/components/custom/custom-select";
import TransactionForm from "@/modules/transactions/components/transaction-form";
import TransactionsTable from "@/modules/transactions/components/transactions-table";
import { useTransactionsListView } from "@/modules/transactions/hooks/use-transactions-list-view";
import { transactionTypeOptions } from "@/modules/transactions/utils/validations";

export default function TransactionsListView() {
  const {
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
    hasPrevious,
    hasNext,
    applyFilters,
    create,
    update,
    startEdit,
    cancelEdit,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    goPrevious,
    goNext,
  } = useTransactionsListView();

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xxiv font-semibold text-app-text">Transactions</h1>
        <p className="text-xiii text-app-text-muted">
          Track income and expenses.
        </p>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">
          Create transaction
        </h2>
        <TransactionForm
          mode="create"
          categories={categories}
          customers={customers}
          currencies={currencies}
          isSubmitting={isCreating}
          onSubmit={create}
        />
      </div>

      {editingTransaction ? (
        <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xvi font-semibold text-app-text">
              Edit transaction
            </h2>
            <CustomButton
              type="button"
              size="sm"
              variant="secondary"
              onClick={cancelEdit}
            >
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
            onSubmit={update}
          />
        </div>
      ) : null}

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xvi font-semibold text-app-text">
            Filter transactions
          </h2>
          <Link
            to="/dashboard/transactions/import"
            className="text-xiii text-app-text hover:underline"
          >
            Go to CSV import
          </Link>
        </div>
        <form onSubmit={applyFilters} className="grid gap-4 md:grid-cols-3">
          <CustomSelect
            control={filterForm.control}
            name="type"
            label="Type"
            options={[
              { value: "all", label: "All" },
              ...transactionTypeOptions,
            ]}
            placeholder="All"
          />
          <CustomSelect
            control={filterForm.control}
            name="categoryId"
            label="Category"
            options={[
              { value: "all", label: "All categories" },
              ...categoriesForType.map((category) => ({
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
          <CustomDatePicker
            control={filterForm.control}
            name="startDate"
            label="From"
            placeholder="Select start date"
          />
          <CustomDatePicker
            control={filterForm.control}
            name="endDate"
            label="To"
            placeholder="Select end date"
          />
          <div className="flex items-end">
            <CustomButton type="submit" loading={isFetching}>
              Apply filters
            </CustomButton>
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
          editingTransactionId={
            isUpdating && editingTransaction ? editingTransaction.id : null
          }
          deletingTransactionId={deletingTransactionId}
          onEdit={startEdit}
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

      <ConfirmActionDialog
        open={!!pendingDeleteTransactionId}
        title="Delete transaction?"
        description="This transaction will be removed from your records."
        confirmLabel="Delete transaction"
        loading={
          !!pendingDeleteTransactionId &&
          deletingTransactionId === pendingDeleteTransactionId
        }
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

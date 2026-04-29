import { CustomButton } from "@/components/custom/custom-button";
import type { Category } from "@/modules/categories/types";
import type { Customer } from "@/modules/customers/types";
import type { CurrencyItem } from "@/modules/currencies/hooks/use-currencies";
import type { Transaction } from "@/modules/transactions/types";

type TransactionsTableProps = {
  transactions: Transaction[];
  categories: Category[];
  customers: Customer[];
  currencies: CurrencyItem[];
  editingTransactionId?: string | null;
  deletingTransactionId?: string | null;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
};

export default function TransactionsTable({
  transactions,
  categories,
  customers,
  currencies,
  editingTransactionId,
  deletingTransactionId,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const currencyMap = new Map(currencies.map((currency) => [currency.code, currency]));

  if (!transactions.length) {
    return (
      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-6 text-xiii text-app-text-muted">
        No transactions found. Add your first transaction to start tracking activity.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[--radius-lg] border border-app-border bg-app-card">
      <table className="w-full min-w-[980px] text-left text-xiii">
        <thead className="border-b border-app-border bg-app-surface text-app-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const category = categoryMap.get(transaction.categoryId);
            const customer = transaction.customerId
              ? customerMap.get(transaction.customerId)
              : null;
            const currency = currencyMap.get(transaction.currency);

            return (
              <tr key={transaction.id} className="border-b border-app-border last:border-b-0">
                <td className="px-4 py-3 text-app-text-muted">
                  {new Date(transaction.transactionDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 capitalize text-app-text">{transaction.type}</td>
                <td className="px-4 py-3 text-app-text">{category?.name ?? "Unknown"}</td>
                <td className="px-4 py-3 text-app-text-muted">
                  {customer ? `${customer.displayName}` : "-"}
                </td>
                <td className="px-4 py-3 text-app-text">
                  {currency?.symbol ?? ""}{transaction.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3 text-app-text-muted">{transaction.reference ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CustomButton
                      type="button"
                      size="sm"
                      variant="secondary"
                      loading={editingTransactionId === transaction.id}
                      onClick={() => onEdit(transaction)}
                    >
                      Edit
                    </CustomButton>
                    <CustomButton
                      type="button"
                      size="sm"
                      variant="danger"
                      loading={deletingTransactionId === transaction.id}
                      onClick={() => onDelete(transaction.id)}
                    >
                      Delete
                    </CustomButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

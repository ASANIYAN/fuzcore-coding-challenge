import { CustomButton } from "@/components/custom/custom-button";
import DataTable, { type ColumnDef } from "@/components/custom/data-table";
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

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "transactionDate",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-app-text-muted">
          {new Date(row.original.transactionDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
    },
    {
      accessorKey: "categoryId",
      header: "Category",
      cell: ({ row }) => categoryMap.get(row.original.categoryId)?.name ?? "Unknown",
    },
    {
      accessorKey: "customerId",
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.customerId
          ? customerMap.get(row.original.customerId)
          : null;
        return <span className="text-app-text-muted">{customer?.displayName ?? "-"}</span>;
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const currency = currencyMap.get(row.original.currency);
        return `${currency?.symbol ?? ""}${row.original.amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => <span className="text-app-text-muted">{row.original.reference ?? "-"}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <CustomButton
            type="button"
            size="sm"
            variant="secondary"
            loading={editingTransactionId === row.original.id}
            onClick={() => onEdit(row.original)}
          >
            Edit
          </CustomButton>
          <CustomButton
            type="button"
            size="sm"
            variant="danger"
            loading={deletingTransactionId === row.original.id}
            onClick={() => onDelete(row.original.id)}
          >
            Delete
          </CustomButton>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={transactions}
      pageSize={10}
      emptyTitle="No transactions found"
      emptyDescription="Add your first transaction to start tracking activity."
    />
  );
}

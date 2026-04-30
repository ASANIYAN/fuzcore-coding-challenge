import { Link } from "react-router-dom";
import DataTable, { type ColumnDef } from "@/components/custom/data-table";
import { Badge } from "@/components/ui/badge";
import type { Customer } from "@/modules/customers/types";
import type { Invoice } from "@/modules/invoices/types";

type InvoicesTableProps = {
  invoices: Invoice[];
  customers: Customer[];
};

function statusBadgeClass(status: Invoice["status"]) {
  if (status === "paid") return "border-status-paid-border bg-status-paid-bg text-status-paid-text";
  if (status === "sent") return "border-status-sent-border bg-status-sent-bg text-status-sent-text";
  if (status === "void") return "border-status-void-border bg-status-void-bg text-status-void-text";
  return "border-status-draft-border bg-status-draft-bg text-status-draft-text";
}

export default function InvoicesTable({ invoices, customers }: InvoicesTableProps) {
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
      cell: ({ row }) => `#${row.original.invoiceNumber}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={`rounded-[--radius-full] capitalize ${statusBadgeClass(row.original.status)}`}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "customerId",
      header: "Customer",
      cell: ({ row }) => {
        const customer = customerMap.get(row.original.customerId);
        return customer ? customer.displayName : "Unknown";
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => `${row.original.currency} ${row.original.total.toFixed(2)}`,
    },
    {
      accessorKey: "issueDate",
      header: "Issue date",
      cell: ({ row }) => new Date(row.original.issueDate).toLocaleDateString(),
    },
    {
      accessorKey: "dueDate",
      header: "Due date",
      cell: ({ row }) =>
        row.original.dueDate
          ? new Date(row.original.dueDate).toLocaleDateString()
          : "-",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Link to={`/dashboard/invoices/${row.original.id}`} className="text-app-primary hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={invoices}
      pageSize={10}
      emptyTitle="No invoices found"
      emptyDescription="Create your first invoice to begin billing customers."
    />
  );
}

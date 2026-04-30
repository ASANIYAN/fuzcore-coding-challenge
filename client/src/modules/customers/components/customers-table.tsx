import { Link } from "react-router-dom";
import { CustomButton } from "@/components/custom/custom-button";
import DataTable, { type ColumnDef } from "@/components/custom/data-table";
import type { Customer } from "@/modules/customers/types";

type CustomersTableProps = {
  customers: Customer[];
  deletingCustomerId?: string | null;
  onDelete: (customerId: string) => void;
};

export default function CustomersTable({
  customers,
  deletingCustomerId,
  onDelete,
}: CustomersTableProps) {
  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "displayName",
      header: "Name",
      cell: ({ row }) => row.original.displayName,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="capitalize text-app-text-muted">{row.original.type}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: "country",
      header: "Country",
      cell: ({ row }) => <span className="text-app-text-muted">{row.original.country ?? "-"}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-app-text-muted">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/dashboard/customers/${row.original.id}`}
            className="text-app-primary hover:underline"
          >
            View
          </Link>
          <CustomButton
            type="button"
            size="sm"
            variant="danger"
            loading={deletingCustomerId === row.original.id}
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
      data={customers}
      pageSize={10}
      emptyTitle="No customers found"
      emptyDescription="Create your first customer to get started."
    />
  );
}

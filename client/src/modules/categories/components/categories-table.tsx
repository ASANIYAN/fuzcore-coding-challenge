import { CustomButton } from "@/components/custom/custom-button";
import DataTable, { type ColumnDef } from "@/components/custom/data-table";
import type { Category } from "@/modules/categories/types";

type CategoriesTableProps = {
  categories: Category[];
  editingCategoryId?: string | null;
  deletingCategoryId?: string | null;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
};

export default function CategoriesTable({
  categories,
  editingCategoryId,
  deletingCategoryId,
  onEdit,
  onDelete,
}: CategoriesTableProps) {
  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="capitalize text-app-text-muted">{row.original.type}</span>
      ),
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
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            loading={editingCategoryId === row.original.id}
            onClick={() => onEdit(row.original)}
          >
            Edit
          </CustomButton>
          <CustomButton
            type="button"
            variant="danger"
            size="sm"
            loading={deletingCategoryId === row.original.id}
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
      data={categories}
      pageSize={10}
      emptyTitle="No categories found"
      emptyDescription="Create one to start tracking transactions."
    />
  );
}

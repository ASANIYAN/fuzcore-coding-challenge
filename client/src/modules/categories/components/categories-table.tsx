import { CustomButton } from "@/components/custom/custom-button";
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
  if (!categories.length) {
    return (
      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-6 text-xiii text-app-text-muted">
        No categories found. Create one to start tracking transactions.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[--radius-lg] border border-app-border bg-app-card">
      <table className="w-full min-w-[620px] text-left text-xiii">
        <thead className="border-b border-app-border bg-app-surface text-app-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-app-border last:border-b-0">
              <td className="px-4 py-3 text-app-text">{category.name}</td>
              <td className="px-4 py-3 capitalize text-app-text-muted">{category.type}</td>
              <td className="px-4 py-3 text-app-text-muted">
                {new Date(category.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <CustomButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={editingCategoryId === category.id}
                    onClick={() => onEdit(category)}
                  >
                    Edit
                  </CustomButton>
                  <CustomButton
                    type="button"
                    variant="danger"
                    size="sm"
                    loading={deletingCategoryId === category.id}
                    onClick={() => onDelete(category.id)}
                  >
                    Delete
                  </CustomButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

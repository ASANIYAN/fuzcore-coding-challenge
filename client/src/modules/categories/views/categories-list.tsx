import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CustomButton } from "@/components/custom/custom-button";
import CustomSelect from "@/components/custom/custom-select";
import CategoriesTable from "@/modules/categories/components/categories-table";
import CategoryForm from "@/modules/categories/components/category-form";
import {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/modules/categories/hooks/use-category-mutations";
import { useCategories } from "@/modules/categories/hooks/use-categories";
import type { Category } from "@/modules/categories/types";
import {
  categoryTypeOptions,
  type CreateCategoryPayload,
} from "@/modules/categories/utils/validations";
import { getApiErrorMessage } from "@/lib/get-api-error-message";

export default function CategoriesListView() {
  const [typeFilter, setTypeFilter] = useState<"income" | "expense" | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const query = useMemo(() => ({ type: typeFilter }), [typeFilter]);

  const { categories, isLoading, isFetching } = useCategories(query);
  const { createCategory, isPending: isCreating } = useCreateCategory(query);
  const { updateCategory, isPending: isUpdating } = useUpdateCategory(query);
  const { deleteCategory } = useDeleteCategory(query);

  const filterForm = useForm({
    defaultValues: {
      type: "all",
    },
  });

  const handleCreate = async (payload: CreateCategoryPayload) => {
    await createCategory(payload);
    toast.success("Category created successfully.");
  };

  const handleUpdate = async (payload: CreateCategoryPayload) => {
    if (!editingCategory) {
      return;
    }

    await updateCategory({
      categoryId: editingCategory.id,
      payload: { name: payload.name },
    });
    setEditingCategory(null);
    toast.success("Category updated successfully.");
  };

  const handleDelete = async (categoryId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this category?");
    if (!confirmed) {
      return;
    }

    try {
      setDeletingCategoryId(categoryId);
      await deleteCategory(categoryId);
      toast.success("Category deleted successfully.");
      if (editingCategory?.id === categoryId) {
        setEditingCategory(null);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete category"));
    } finally {
      setDeletingCategoryId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xxiv font-semibold text-app-text">Categories</h1>
        <p className="text-xiii text-app-text-muted">
          Create and manage income and expense categories used in transactions.
        </p>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">Create category</h2>
        <CategoryForm mode="create" isSubmitting={isCreating} onSubmit={handleCreate} />
      </div>

      {editingCategory ? (
        <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xvi font-semibold text-app-text">Edit category</h2>
            <CustomButton type="button" size="sm" variant="secondary" onClick={() => setEditingCategory(null)}>
              Cancel
            </CustomButton>
          </div>
          <CategoryForm
            mode="edit"
            initialValue={editingCategory}
            isSubmitting={isUpdating}
            onSubmit={handleUpdate}
          />
        </div>
      ) : null}

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">Filter categories</h2>
        <form
          onSubmit={filterForm.handleSubmit((values) => {
            setTypeFilter(
              values.type === "all" ? undefined : (values.type as "income" | "expense"),
            );
          })}
          className="grid gap-4 md:max-w-xs"
        >
          <CustomSelect
            control={filterForm.control}
            name="type"
            label="Type"
            options={[{ value: "all", label: "All" }, ...categoryTypeOptions]}
            placeholder="All"
          />
          <CustomButton type="submit" loading={isFetching}>Apply filter</CustomButton>
        </form>
      </div>

      {isLoading ? (
        <p className="text-xiii text-app-text-muted">Loading categories...</p>
      ) : (
        <CategoriesTable
          categories={categories}
          editingCategoryId={isUpdating && editingCategory ? editingCategory.id : null}
          deletingCategoryId={deletingCategoryId}
          onEdit={(category) => setEditingCategory(category)}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}

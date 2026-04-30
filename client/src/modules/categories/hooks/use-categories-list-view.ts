import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/modules/categories/hooks/use-category-mutations";
import { useCategories } from "@/modules/categories/hooks/use-categories";
import type { Category } from "@/modules/categories/types";
import type { CreateCategoryPayload } from "@/modules/categories/utils/validations";
import { getApiErrorMessage } from "@/lib/get-api-error-message";

export function useCategoriesListView() {
  const [typeFilter, setTypeFilter] = useState<"income" | "expense" | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState<string | null>(null);

  const query = useMemo(() => ({ type: typeFilter }), [typeFilter]);

  const filterForm = useForm({
    defaultValues: {
      type: "all",
    },
  });

  const { categories, isLoading, isFetching } = useCategories(query);
  const { createCategory, isPending: isCreating } = useCreateCategory(query);
  const { updateCategory, isPending: isUpdating } = useUpdateCategory(query);
  const { deleteCategory } = useDeleteCategory(query);

  const applyFilters = filterForm.handleSubmit((values) => {
    setTypeFilter(
      values.type === "all" ? undefined : (values.type as "income" | "expense"),
    );
  });

  const create = async (payload: CreateCategoryPayload) => {
    await createCategory(payload);
    toast.success("Category created successfully.");
  };

  const update = async (payload: CreateCategoryPayload) => {
    if (!editingCategory) return;

    await updateCategory({
      categoryId: editingCategory.id,
      payload: { name: payload.name },
    });
    setEditingCategory(null);
    toast.success("Category updated successfully.");
  };

  const confirmDelete = async () => {
    if (!pendingDeleteCategoryId) return;

    try {
      setDeletingCategoryId(pendingDeleteCategoryId);
      await deleteCategory(pendingDeleteCategoryId);
      toast.success("Category deleted successfully.");
      if (editingCategory?.id === pendingDeleteCategoryId) {
        setEditingCategory(null);
      }
      setPendingDeleteCategoryId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete category"));
    } finally {
      setDeletingCategoryId(null);
    }
  };

  return {
    filterForm,
    categories,
    editingCategory,
    deletingCategoryId,
    pendingDeleteCategoryId,
    isLoading,
    isFetching,
    isCreating,
    isUpdating,
    applyFilters,
    create,
    update,
    startEdit: setEditingCategory,
    cancelEdit: () => setEditingCategory(null),
    openDeleteDialog: setPendingDeleteCategoryId,
    closeDeleteDialog: () => setPendingDeleteCategoryId(null),
    confirmDelete,
  };
}

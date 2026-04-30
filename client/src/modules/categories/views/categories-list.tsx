import { CustomButton } from "@/components/custom/custom-button";
import ConfirmActionDialog from "@/components/custom/confirm-action-dialog";
import CustomSelect from "@/components/custom/custom-select";
import CategoriesTable from "@/modules/categories/components/categories-table";
import CategoryForm from "@/modules/categories/components/category-form";
import { useCategoriesListView } from "@/modules/categories/hooks/use-categories-list-view";
import {
  categoryTypeOptions,
} from "@/modules/categories/utils/validations";

export default function CategoriesListView() {
  const {
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
    startEdit,
    cancelEdit,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  } = useCategoriesListView();

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
        <CategoryForm mode="create" isSubmitting={isCreating} onSubmit={create} />
      </div>

      {editingCategory ? (
        <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xvi font-semibold text-app-text">Edit category</h2>
            <CustomButton type="button" size="sm" variant="secondary" onClick={cancelEdit}>
              Cancel
            </CustomButton>
          </div>
          <CategoryForm
            mode="edit"
            initialValue={editingCategory}
            isSubmitting={isUpdating}
            onSubmit={update}
          />
        </div>
      ) : null}

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">Filter categories</h2>
        <form
          onSubmit={applyFilters}
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
          onEdit={startEdit}
          onDelete={openDeleteDialog}
        />
      )}

      <ConfirmActionDialog
        open={!!pendingDeleteCategoryId}
        title="Delete category?"
        description="This category will be removed from active use in your workspace."
        confirmLabel="Delete category"
        loading={!!pendingDeleteCategoryId && deletingCategoryId === pendingDeleteCategoryId}
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

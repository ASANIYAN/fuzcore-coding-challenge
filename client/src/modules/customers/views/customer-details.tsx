import { Link } from "react-router-dom";
import { CustomButton } from "@/components/custom/custom-button";
import ConfirmActionDialog from "@/components/custom/confirm-action-dialog";
import CustomerForm from "@/modules/customers/components/customer-form";
import { useCustomerDetailsView } from "@/modules/customers/hooks/use-customer-details-view";
import { getApiErrorMessage } from "@/lib/get-api-error-message";

export default function CustomerDetailsView() {
  const {
    customer,
    isLoading,
    error,
    isUpdating,
    isDeleting,
    isDeleteDialogOpen,
    openDeleteDialog,
    setIsDeleteDialogOpen,
    update,
    confirmDelete,
  } = useCustomerDetailsView();

  if (isLoading) {
    return (
      <p className="text-xiii text-app-text-muted">
        Loading customer details...
      </p>
    );
  }

  if (error || !customer) {
    return (
      <section className="space-y-4">
        <p className="text-xiii text-app-danger">
          {getApiErrorMessage(
            error,
            "We could not load this customer right now.",
          )}
        </p>
        <Link
          className="text-xiii text-app-text hover:underline"
          to="/dashboard/customers"
        >
          Back to customers
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xxiv font-semibold text-app-text">Edit customer</h1>
        <p className="text-xiii text-app-text-muted">
          Update details for {customer.displayName}.
        </p>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <CustomerForm
          mode="edit"
          initialValue={customer}
          isSubmitting={isUpdating}
          onSubmit={update}
        />
      </div>

      <div className="flex items-center gap-3">
        <CustomButton
          type="button"
          variant="danger"
          loading={isDeleting}
          onClick={openDeleteDialog}
        >
          Delete customer
        </CustomButton>
        <Link
          className="text-xiii text-app-text hover:underline"
          to="/dashboard/customers"
        >
          Back to customers
        </Link>
      </div>

      <ConfirmActionDialog
        open={isDeleteDialogOpen}
        title="Delete customer?"
        description="This will remove the customer from your active records."
        confirmLabel="Delete customer"
        loading={isDeleting}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}

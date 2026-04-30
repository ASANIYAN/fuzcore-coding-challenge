import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CustomButton } from "@/components/custom/custom-button";
import ConfirmActionDialog from "@/components/custom/confirm-action-dialog";
import CustomerForm from "@/modules/customers/components/customer-form";
import { useCustomer } from "@/modules/customers/hooks/use-customer";
import {
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/modules/customers/hooks/use-customer-mutations";
import { getApiErrorMessage } from "@/lib/get-api-error-message";

const defaultListQuery = {
  page: 1,
  limit: 20,
  search: undefined,
  type: undefined,
} as const;

export default function CustomerDetailsView() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { customer, isLoading, error } = useCustomer(id);
  const { updateCustomer, isPending: isUpdating } = useUpdateCustomer(defaultListQuery);
  const { deleteCustomer, isPending: isDeleting } = useDeleteCustomer(defaultListQuery);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (isLoading) {
    return <p className="text-xiii text-app-text-muted">Loading customer details...</p>;
  }

  if (error || !customer) {
    return (
      <section className="space-y-4">
        <p className="text-xiii text-app-danger">
          {getApiErrorMessage(error, "We could not load this customer right now.")}
        </p>
        <Link className="text-xiii text-app-primary hover:underline" to="/dashboard/customers">
          Back to customers
        </Link>
      </section>
    );
  }

  const handleUpdate = async (
    payload: Parameters<typeof updateCustomer>[0]["payload"],
  ) => {
    await updateCustomer({ customerId: customer.id, payload });
    toast.success("Customer updated successfully.");
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer(customer.id);
      toast.success("Customer deleted successfully.");
      setIsDeleteDialogOpen(false);
      void navigate("/dashboard/customers");
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, "Unable to delete customer"));
    }
  };

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
          onSubmit={handleUpdate}
        />
      </div>

      <div className="flex items-center gap-3">
        <CustomButton
          type="button"
          variant="danger"
          loading={isDeleting}
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          Delete customer
        </CustomButton>
        <Link className="text-xiii text-app-primary hover:underline" to="/dashboard/customers">
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
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}

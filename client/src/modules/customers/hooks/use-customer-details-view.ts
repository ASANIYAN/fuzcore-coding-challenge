import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
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

export function useCustomerDetailsView() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { customer, isLoading, error } = useCustomer(id);
  const { updateCustomer, isPending: isUpdating } = useUpdateCustomer(defaultListQuery);
  const { deleteCustomer, isPending: isDeleting } = useDeleteCustomer(defaultListQuery);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const update = async (
    payload: Parameters<typeof updateCustomer>[0]["payload"],
  ) => {
    if (!customer) return;
    await updateCustomer({ customerId: customer.id, payload });
    toast.success("Customer updated successfully.");
  };

  const confirmDelete = async () => {
    if (!customer) return;

    try {
      await deleteCustomer(customer.id);
      toast.success("Customer deleted successfully.");
      setIsDeleteDialogOpen(false);
      void navigate("/dashboard/customers");
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, "Unable to delete customer"));
    }
  };

  return {
    customer,
    isLoading,
    error,
    isUpdating,
    isDeleting,
    isDeleteDialogOpen,
    openDeleteDialog: () => setIsDeleteDialogOpen(true),
    setIsDeleteDialogOpen,
    update,
    confirmDelete,
  };
}

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCustomers } from "@/modules/customers/hooks/use-customers";
import { useCurrencies } from "@/modules/currencies/hooks/use-currencies";
import { useCreateInvoice } from "@/modules/invoices/hooks/use-invoice-mutations";
import type { CreateInvoicePayload } from "@/modules/invoices/utils/validations";

const listQuery = {
  page: 1,
  limit: 20,
  status: undefined,
  customerId: undefined,
  from: undefined,
  to: undefined,
} as const;

const customerOptionsQuery = {
  page: 1,
  limit: 100,
  search: undefined,
  type: undefined,
} as const;

export function useInvoiceCreateView() {
  const navigate = useNavigate();
  const { customers } = useCustomers(customerOptionsQuery);
  const { currencies } = useCurrencies();
  const { createInvoice, isPending } = useCreateInvoice(listQuery);

  const create = async (payload: CreateInvoicePayload) => {
    const created = await createInvoice(payload);
    toast.success("Invoice created successfully.");
    void navigate(`/dashboard/invoices/${created.id}`);
  };

  return {
    customers,
    currencies,
    isPending,
    create,
  };
}

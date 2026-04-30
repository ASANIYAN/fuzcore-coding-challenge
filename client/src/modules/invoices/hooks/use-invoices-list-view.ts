import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useCustomers } from "@/modules/customers/hooks/use-customers";
import { useInvoices } from "@/modules/invoices/hooks/use-invoices";
import type { ListInvoicesQuery } from "@/modules/invoices/utils/validations";

function toIsoStartOfDay(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toISOString();
}

function toIsoEndOfDay(dateString: string) {
  return new Date(`${dateString}T23:59:59.999`).toISOString();
}

const customerOptionsQuery = {
  page: 1,
  limit: 100,
  search: undefined,
  type: undefined,
} as const;

export function useInvoicesListView() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ListInvoicesQuery["status"]>(undefined);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const query = useMemo(
    () => ({ page, limit: 20, status, customerId, from, to }),
    [page, status, customerId, from, to],
  );

  const filterForm = useForm({
    defaultValues: {
      status: "all",
      customerId: "all",
      from: "",
      to: "",
    },
  });

  const { invoices, meta, isLoading, isFetching } = useInvoices(query);
  const { customers } = useCustomers(customerOptionsQuery);

  const applyFilters = filterForm.handleSubmit((values) => {
    setPage(1);
    setStatus(values.status === "all" ? undefined : (values.status as ListInvoicesQuery["status"]));
    setCustomerId(values.customerId === "all" ? undefined : values.customerId);
    setFrom(values.from ? toIsoStartOfDay(values.from) : undefined);
    setTo(values.to ? toIsoEndOfDay(values.to) : undefined);
  });

  return {
    filterForm,
    invoices,
    meta,
    customers,
    isLoading,
    isFetching,
    hasPrevious: meta.page > 1,
    hasNext: meta.page < meta.totalPages,
    applyFilters,
    goPrevious: () => setPage((current) => Math.max(1, current - 1)),
    goNext: () => setPage((current) => current + 1),
  };
}

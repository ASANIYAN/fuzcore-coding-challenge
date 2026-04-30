import { useForm } from "react-hook-form";
import { useDashboard } from "@/modules/dashboard/hooks/use-dashboard";

function toIsoStartOfDay(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toISOString();
}

function toIsoEndOfDay(dateString: string) {
  return new Date(`${dateString}T23:59:59.999`).toISOString();
}

export function useDashboardView() {
  const filterForm = useForm({
    defaultValues: {
      from: "",
      to: "",
    },
  });

  const from = filterForm.watch("from");
  const to = filterForm.watch("to");

  const dashboardFrom = from ? toIsoStartOfDay(from) : undefined;
  const dashboardTo = to ? toIsoEndOfDay(to) : undefined;

  const { dashboard, isLoading, isFetching } = useDashboard(dashboardFrom, dashboardTo);

  return {
    filterForm,
    dashboard,
    isLoading,
    isFetching,
  };
}

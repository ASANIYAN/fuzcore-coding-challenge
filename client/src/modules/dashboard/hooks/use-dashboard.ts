import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";
import type { DashboardResponse } from "@/modules/dashboard/types";

export function dashboardQueryKey(from?: string, to?: string) {
  return ["dashboard", { from, to }] as const;
}

export function useDashboard(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const request = useQuery({
    queryKey: dashboardQueryKey(from, to),
    queryFn: async () => {
      const response = await authApi.get<DashboardResponse>("/dashboard", { params });
      return response.data.data;
    },
  });

  return {
    dashboard: request.data ?? null,
    isLoading: request.isLoading,
    isFetching: request.isFetching,
    error: request.error,
    refetch: request.refetch,
  };
}

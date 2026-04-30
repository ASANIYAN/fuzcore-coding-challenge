import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";

export const SESSION_STATUS_QUERY_KEY = ["session-status"] as const;

type SessionStatusResponse = {
  success: true;
  data: {
    authenticated: boolean;
    user: {
      id: string;
      email: string;
      emailVerifiedAt: string | null;
    } | null;
  };
};

export function useSessionStatus() {
  const query = useQuery({
    queryKey: SESSION_STATUS_QUERY_KEY,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const response = await authApi.get<SessionStatusResponse>("/auth/session", {
        params: { t: Date.now() },
      });
      return response.data.data;
    },
  });

  return {
    isAuthenticated: query.data?.authenticated ?? false,
    user: query.data?.user ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

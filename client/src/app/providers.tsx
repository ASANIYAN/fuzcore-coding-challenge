import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import router from "@/app/router";
import {
  AUTH_FAILURE_EVENT,
  LOGIN_ROUTE,
  type AuthFailureEventDetail,
} from "@/lib/auth-failure";
import { useBackendWarmup } from "@/modules/system/hooks/use-backend-warmup";
import {
  registerSessionNavigator,
  registerSessionQueryClient,
} from "@/modules/system/session/session-runtime";
import { CURRENCIES_QUERY_KEY } from "@/modules/currencies/hooks/use-currencies";
import { unauthApi } from "@/services/api-service";

type ProvidersProps = { children?: ReactNode };

export default function Providers({ children }: ProvidersProps) {
  useBackendWarmup();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  registerSessionQueryClient(queryClient);
  registerSessionNavigator((to, options) => {
    void router.navigate(to, { replace: options?.replace });
  });

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: CURRENCIES_QUERY_KEY,
      queryFn: async () => {
        const response = await unauthApi.get<{
          success: true;
          data: Array<{ code: string; name: string; symbol: string }>;
        }>("/currencies");
        return response.data.data;
      },
    });
  }, [queryClient]);

  useEffect(() => {
    const onAuthFailure = (event: Event) => {
      const customEvent = event as CustomEvent<AuthFailureEventDetail>;
      const detail = customEvent.detail;
      if (!detail) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ["session-status"] });
      toast.error(detail.message);
      void router.navigate(LOGIN_ROUTE, { replace: true });
    };

    window.addEventListener(AUTH_FAILURE_EVENT, onAuthFailure);
    return () => {
      window.removeEventListener(AUTH_FAILURE_EVENT, onAuthFailure);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {children}
      <Toaster richColors={false} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

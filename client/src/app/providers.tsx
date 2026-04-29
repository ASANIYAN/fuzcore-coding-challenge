import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import router from "@/app/router";
import { useBackendWarmup } from "@/modules/system/hooks/use-backend-warmup";
import {
  registerSessionNavigator,
  registerSessionQueryClient,
} from "@/modules/system/session/session-runtime";

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

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {children}
      <Toaster richColors={false} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

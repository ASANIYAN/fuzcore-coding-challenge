import type { QueryClient } from "@tanstack/react-query";

type NavigateFn = (to: string, options?: { replace?: boolean }) => void;

let queryClientRef: QueryClient | null = null;
let navigateRef: NavigateFn | null = null;

export function registerSessionQueryClient(queryClient: QueryClient) {
  queryClientRef = queryClient;
}

export function getSessionQueryClient() {
  return queryClientRef;
}

export function registerSessionNavigator(navigate: NavigateFn) {
  navigateRef = navigate;
}

export function getSessionNavigator() {
  return navigateRef;
}

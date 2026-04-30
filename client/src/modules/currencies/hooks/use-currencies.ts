import { useQuery } from "@tanstack/react-query";
import { unauthApi } from "@/services/api-service";

export const CURRENCIES_QUERY_KEY = ["currencies"] as const;

export type CurrencyItem = {
  code: string;
  name: string;
  symbol: string;
};

type CurrenciesResponse = {
  success: true;
  data: CurrencyItem[];
};

export function useCurrencies() {
  const query = useQuery({
    queryKey: CURRENCIES_QUERY_KEY,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const response = await unauthApi.get<CurrenciesResponse>("/currencies");
      return response.data.data;
    },
  });

  return {
    currencies: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

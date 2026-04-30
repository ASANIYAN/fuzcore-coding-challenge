import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi } from "@/services/api-service";

export type ImportJobError = {
  row: number;
  reason: string;
};

export type ImportJobStatus = {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalRows: number | null;
  importedRows: number | null;
  duplicateRows: number | null;
  failedRows: number | null;
  errors: ImportJobError[];
  startedAt: string | null;
  completedAt: string | null;
};

type QueueImportResponse = {
  success: true;
  data: {
    jobId: string;
    message: string;
  };
};

type ImportStatusResponse = {
  success: true;
  data: ImportJobStatus;
};

export function importStatusQueryKey(jobId: string) {
  return ["transactions", "import-status", jobId] as const;
}

export function useQueueTransactionImport() {
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await authApi.post<QueueImportResponse>(
        "/transactions/import",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      return response.data.data;
    },
  });

  return {
    queueImport: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useImportStatus(jobId: string | null) {
  const query = useQuery({
    queryKey: jobId ? importStatusQueryKey(jobId) : ["transactions", "import-status", "idle"],
    enabled: Boolean(jobId),
    queryFn: async () => {
      const response = await authApi.get<ImportStatusResponse>(`/transactions/import/${jobId}`);
      return response.data.data;
    },
    refetchInterval: (queryInfo) => {
      const status = queryInfo.state.data?.status;
      if (status === "pending" || status === "processing") {
        return 2000;
      }
      return false;
    },
  });

  return {
    status: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useDownloadTransactionImportSample() {
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await authApi.get("/transactions/import/sample", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "transactions-sample.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  return {
    downloadSample: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

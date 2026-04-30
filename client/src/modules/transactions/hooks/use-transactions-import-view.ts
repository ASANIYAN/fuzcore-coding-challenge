import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import {
  useDownloadTransactionImportSample,
  useImportStatus,
  useQueueTransactionImport,
} from "@/modules/transactions/hooks/use-transaction-import";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function useTransactionsImportView() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const { queueImport, isPending: isQueueing } = useQueueTransactionImport();
  const { status, isFetching: isPolling, error: pollError } = useImportStatus(jobId);
  const { downloadSample, isPending: isDownloadingSample } =
    useDownloadTransactionImportSample();

  const importState = status?.status ?? "idle";

  const summary = useMemo(() => {
    if (!status) {
      return null;
    }

    return [
      { label: "Total rows", value: status.totalRows ?? 0 },
      { label: "Imported", value: status.importedRows ?? 0 },
      { label: "Duplicates", value: status.duplicateRows ?? 0 },
      { label: "Failed", value: status.failedRows ?? 0 },
    ];
  }, [status]);

  const changeFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a CSV file.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File is too large. Maximum size is 2MB.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const queue = async () => {
    if (!selectedFile) {
      toast.error("Please choose a CSV file to upload.");
      return;
    }

    try {
      const result = await queueImport(selectedFile);
      setJobId(result.jobId);
      toast.success("Import queued successfully. We are processing your file.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to queue import"));
    }
  };

  const downloadSampleFile = async () => {
    try {
      await downloadSample();
      toast.success("Sample CSV downloaded.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to download sample CSV"));
    }
  };

  return {
    selectedFile,
    jobId,
    status,
    importState,
    summary,
    isQueueing,
    isPolling,
    pollError,
    isDownloadingSample,
    formattedSelectedFileSize: selectedFile ? formatFileSize(selectedFile.size) : null,
    changeFile,
    queue,
    downloadSampleFile,
  };
}

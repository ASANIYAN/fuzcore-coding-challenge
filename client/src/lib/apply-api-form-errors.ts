import axios from "axios";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

type ApiErrorDetail = {
  path?: string[];
  message?: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
    details?: ApiErrorDetail[];
  };
};

export function applyApiFormErrors<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  error: unknown,
  fallbackMessage = "Something went wrong",
) {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    form.setError("root", { message: fallbackMessage });
    return;
  }

  const details = error.response?.data?.error?.details;
  if (details?.length) {
    for (const detail of details) {
      const fieldName = detail.path?.[0];
      if (fieldName) {
        form.setError(fieldName as Path<TFieldValues>, {
          message: detail.message ?? "Invalid value",
        });
      }
    }
  }

  const rootMessage = error.response?.data?.error?.message ?? fallbackMessage;
  form.setError("root", { message: rootMessage });
}

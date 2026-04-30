import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/get-api-error-message";

export function applyApiFormErrors<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  error: unknown,
  fallbackMessage = "Something went wrong",
) {
  const fieldErrors = getApiFieldErrors(error);
  const entries = Object.entries(fieldErrors);
  for (const [fieldName, message] of entries) {
    if (!fieldName) continue;
    form.setError(fieldName as Path<TFieldValues>, {
      message: message || "Invalid value",
    });
  }

  const rootMessage = getApiErrorMessage(error, fallbackMessage);
  form.setError("root", { message: rootMessage });
}

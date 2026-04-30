import axios from "axios";
import { getFriendlyStatusMessage, getHttpStatus } from "@/lib/http-error";

type ApiErrorDetail = {
  path?: string[];
  message?: string;
};

type ApiErrorPayload = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
  };
};

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";

export const getApiFieldErrors = (error: unknown): Record<string, string> => {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return {};
  }

  const details = error.response?.data?.error?.details;
  if (!Array.isArray(details)) {
    return {};
  }

  const fieldErrors: Record<string, string> = {};
  for (const detail of details) {
    const path = Array.isArray(detail.path) ? detail.path.join(".") : "";
    const message = typeof detail.message === "string" ? detail.message : "";
    if (path && message) {
      fieldErrors[path] = message;
    }
  }

  return fieldErrors;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = FALLBACK_ERROR_MESSAGE,
): string => {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const responseMessage = error.response?.data?.error?.message;
    if (typeof responseMessage === "string" && responseMessage.trim().length > 0) {
      return responseMessage;
    }

    const fieldErrors = getApiFieldErrors(error);
    const firstFieldError = Object.values(fieldErrors)[0];
    if (firstFieldError) {
      return firstFieldError;
    }

    const status = error.response?.status;
    if (status) {
      return getFriendlyStatusMessage(status);
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  const status = getHttpStatus(error);
  if (status) {
    return getFriendlyStatusMessage(status);
  }

  return fallback;
};

import axios from "axios";

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ path?: string[]; message?: string }>;
  };
};

export function getHttpStatus(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}

export function getFriendlyStatusMessage(status: number | undefined) {
  if (status === 400) return "Please review your input and try again.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "We could not find the requested resource.";
  if (status === 409) return "This action conflicts with existing data.";
  if (status === 429) return "Too many requests. Please wait and try again.";
  if (status === 500) return "Something went wrong on our side. Please try again.";
  return "Something went wrong. Please try again.";
}

export function getDetailedApiMessage(error: unknown, fallback?: string) {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const message = error.response?.data?.error?.message;
    if (message) {
      return message;
    }
  }
  return fallback ?? "Something went wrong. Please try again.";
}


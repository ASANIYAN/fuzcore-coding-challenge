import axios, { type AxiosError } from "axios";

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

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const axiosError = error as AxiosError<ApiErrorPayload>;
    const details = axiosError.response?.data?.error?.details;
    if (details?.length) {
      return details[0]?.message ?? fallback;
    }

    return axiosError.response?.data?.error?.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

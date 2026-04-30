import axios from "axios";
import { notifyAuthFailure } from "@/lib/auth-failure";

function getApiBaseUrl() {
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api";
  const trimmedBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  return trimmedBaseUrl.endsWith("/api") ? trimmedBaseUrl : `${trimmedBaseUrl}/api`;
}

const apiBaseUrl = getApiBaseUrl();

export const unauthApi = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authApi = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const formAuthApi = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

const attachAuthFailureInterceptors = (client: typeof authApi) =>
  client.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        notifyAuthFailure("forbidden");
        return Promise.reject(error);
      }

      if (error.response?.status === 401) {
      const requestUrl = error.config?.url ?? "";
      const isSessionProbe = requestUrl.includes("/auth/session");
      const isAuthPublicRoute =
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/signup") ||
        requestUrl.includes("/auth/verify-email") ||
        requestUrl.includes("/auth/forgot-password") ||
        requestUrl.includes("/auth/reset-password");

      if (!isSessionProbe && !isAuthPublicRoute) {
        notifyAuthFailure("unauthorized");
      }
    }
    }

    return Promise.reject(error);
  },
);

attachAuthFailureInterceptors(authApi);
attachAuthFailureInterceptors(formAuthApi);

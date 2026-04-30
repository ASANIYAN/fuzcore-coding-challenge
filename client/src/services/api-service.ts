import axios from "axios";
import { notifyAuthFailure } from "@/lib/auth-failure";

const LOOPBACK_HOST_PATTERN = /^(localhost|127\.0\.0\.1)$/i;

function getDefaultPort(protocol: string) {
  return protocol === "https:" ? "443" : "80";
}

function ensureApiPath(url: URL) {
  const normalizedPath = url.pathname.replace(/\/+$/, "");
  if (normalizedPath.endsWith("/api")) {
    url.pathname = normalizedPath || "/api";
    return;
  }

  url.pathname = `${normalizedPath}/api`;
}

function getApiBaseUrl() {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const fallbackOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5001";
  const parsedUrl = new URL(envBaseUrl || "/api", fallbackOrigin);

  if (typeof window !== "undefined") {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const currentPort = window.location.port || getDefaultPort(currentProtocol);
    const basePort = parsedUrl.port || getDefaultPort(parsedUrl.protocol);

    const isCurrentLoopback = LOOPBACK_HOST_PATTERN.test(currentHost);
    const isBaseLoopback = LOOPBACK_HOST_PATTERN.test(parsedUrl.hostname);

    if (
      isCurrentLoopback &&
      isBaseLoopback &&
      parsedUrl.protocol === currentProtocol &&
      basePort === currentPort
    ) {
      parsedUrl.hostname = currentHost;
    }
  }

  ensureApiPath(parsedUrl);
  return parsedUrl.toString().replace(/\/+$/, "");
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

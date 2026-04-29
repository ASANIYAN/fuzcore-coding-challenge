import axios from "axios";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001";
const apiBaseUrl = `${baseUrl}/api`;

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

authApi.interceptors.response.use(
  (response) => response,
  async (error: unknown) => Promise.reject(error),
);

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, API_PATHS, ROUTES } from "@/constants/api";
import type { ApiErrorBody } from "@/types/auth";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const SKIP_REFRESH = new Set([
  API_PATHS.login,
  API_PATHS.register,
  API_PATHS.refresh,
  API_PATHS.forgotPassword,
  API_PATHS.resetPassword,
  API_PATHS.verifyEmail,
]);

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  config.headers.set("x-request-id", crypto.randomUUID());
  return config;
});

let refreshPromise: Promise<void> | null = null;

function shouldSkipRefresh(config?: RetryConfig) {
  const url = config?.url ?? "";
  return [...SKIP_REFRESH].some((path) => url.includes(path));
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== ROUTES.login) {
    window.location.assign(ROUTES.login);
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetryConfig | undefined;
    if (error.response?.status !== 401 || !original || original._retry || shouldSkipRefresh(original)) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api.post(API_PATHS.refresh).then(() => undefined);
      }
      await refreshPromise;
      return api(original);
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

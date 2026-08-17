import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, API_PATHS, ROUTES } from "@/constants/api";
import type { ApiErrorBody } from "@/types/auth";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/** Endpoints that establish or reset credentials. A 401 from these is final. */
const SKIP_REFRESH = new Set<string>([
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

/**
 * Only an expired or missing access token is worth retrying.
 * A wrong password on change-password also answers 401, and rotating tokens to
 * replay it would just fail twice.
 */
function isExpiredTokenError(error: AxiosError<ApiErrorBody>) {
  return error.response?.data?.error?.code === "UNAUTHORIZED";
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
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      shouldSkipRefresh(original) ||
      !isExpiredTokenError(error)
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    // Hold a local reference: a sibling request may null the shared slot
    // as soon as its own retry settles.
    const pending = (refreshPromise ??= api
      .post(API_PATHS.refresh)
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      }));

    try {
      await pending;
      return api(original);
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(refreshError);
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

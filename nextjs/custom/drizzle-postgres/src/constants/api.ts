/**
 * Where the browser sends API calls.
 * Relative by default (same-origin Next.js Route Handlers). Set
 * NEXT_PUBLIC_API_URL to an absolute origin — https://api.example.com/api/v1 —
 * to point this frontend at a separately deployed backend without touching code.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export const COOKIE = {
  access: "access_token",
  refresh: "refresh_token",
} as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  authCallback: "/auth/callback",
  dashboard: "/dashboard",
} as const;

export const API_PATHS = {
  register: "/auth/register",
  login: "/auth/login",
  logout: "/auth/logout",
  refresh: "/auth/refresh",
  google: "/auth/google",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  verifyEmail: "/auth/verify-email",
  changePassword: "/auth/change-password",
  me: "/users/me",
  sessions: "/users/me/sessions",
} as const;

export const QUERY_KEYS = {
  me: ["me"] as const,
  sessions: ["sessions"] as const,
};

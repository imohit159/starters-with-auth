export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const TRPC_URL = `${API_BASE_URL}/trpc`;

export const GOOGLE_AUTH_URL = `${API_BASE_URL}/api/v1/auth/google`;

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

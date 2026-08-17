export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const GOOGLE_AUTH_URL = `${API_BASE_URL}/auth/google`;

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
  onboarding: "/onboarding",
  billing: "/dashboard/billing",
  settings: "/dashboard/settings",
  admin: "/admin",
  acceptInvite: "/invite/accept",
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
  me: "/users/me",
  orgs: "/orgs",
  acceptInvite: "/orgs/invites/accept",
} as const;

export const QUERY_KEYS = {
  me: ["me"] as const,
  orgs: ["orgs"] as const,
  org: (organizationId: string) => ["orgs", organizationId] as const,
  members: (organizationId: string) => ["orgs", organizationId, "members"] as const,
  billing: (organizationId: string) => ["billing", organizationId] as const,
  todos: (organizationId: string) => ["todos", organizationId] as const,
  adminUsers: (email: string) => ["admin", "users", email] as const,
  adminUser: (userId: string) => ["admin", "user", userId] as const,
};

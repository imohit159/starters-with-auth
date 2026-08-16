export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

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
  org: (organizationId: string) => `/orgs/${organizationId}`,
  orgMembers: (organizationId: string) => `/orgs/${organizationId}/members`,
  orgInvites: (organizationId: string) => `/orgs/${organizationId}/invites`,
  orgInvite: (organizationId: string, inviteId: string) => `/orgs/${organizationId}/invites/${inviteId}`,
  orgMember: (organizationId: string, userId: string) => `/orgs/${organizationId}/members/${userId}`,
  acceptInvite: "/orgs/invites/accept",
  orgBilling: (organizationId: string) => `/orgs/${organizationId}/billing`,
  orgCheckout: (organizationId: string) => `/orgs/${organizationId}/billing/checkout`,
  orgPortal: (organizationId: string) => `/orgs/${organizationId}/billing/portal`,
  orgTodos: (organizationId: string) => `/orgs/${organizationId}/todos`,
  orgTodo: (organizationId: string, todoId: string) => `/orgs/${organizationId}/todos/${todoId}`,
  adminUsers: "/admin/users",
  adminUser: (userId: string) => `/admin/users/${userId}`,
  adminGrant: (organizationId: string) => `/admin/orgs/${organizationId}/grant`,
  adminRevoke: (organizationId: string) => `/admin/orgs/${organizationId}/revoke`,
} as const;

export const QUERY_KEYS = {
  me: ["me"] as const,
  orgs: ["orgs"] as const,
  org: (organizationId: string) => ["orgs", organizationId] as const,
  members: (organizationId: string) => ["orgs", organizationId, "members"] as const,
  subscription: (organizationId: string) => ["billing", organizationId] as const,
  todos: (organizationId: string) => ["todos", organizationId] as const,
  adminUsers: (email: string) => ["admin", "users", email] as const,
  adminUser: (userId: string) => ["admin", "user", userId] as const,
};

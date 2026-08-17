export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: "active" | "disabled" | "pending_verification";
  emailVerifiedAt: string | null;
  roles: string[];
};

export type AuthResponse = {
  user: User;
  message?: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  isSubscribed: boolean;
};

export type Member = {
  userId: string;
  email: string;
  displayName: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
};

export type Invite = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  createdAt: string;
};

export type Todo = {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Subscription = {
  organizationId: string;
  status: string;
  subscriptionEndsAt: string | null;
  isSubscribed: boolean;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
};

export type AdminUserOrg = {
  organizationId: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  isSubscribed: boolean;
};

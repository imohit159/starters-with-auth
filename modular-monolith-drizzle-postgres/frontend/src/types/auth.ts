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

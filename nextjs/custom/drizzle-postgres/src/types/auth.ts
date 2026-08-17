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

/**
 * Register can legitimately answer without a user: when the address already
 * belongs to a passwordless account the server mails a set-password link and
 * tells the caller nothing about the account.
 */
export type RegisterResponse = {
  user: User | null;
  message?: string;
};

export type Session = {
  id: string;
  current: boolean;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

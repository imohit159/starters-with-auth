export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: "active" | "disabled" | "pending_verification";
  emailVerifiedAt: string | null;
  roles: string[];
};

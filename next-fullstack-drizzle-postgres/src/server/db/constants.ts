export const USER_STATUS = {
  active: "active",
  disabled: "disabled",
  pendingVerification: "pending_verification",
} as const;

export const IDENTITY_PROVIDER = {
  password: "password",
  google: "google",
} as const;

export const CHALLENGE_TYPE = {
  emailVerification: "email_verification",
  passwordReset: "password_reset",
  oauthState: "oauth_state",
} as const;

export const SESSION_REVOKE_REASON = {
  logout: "logout",
  rotated: "rotated",
  reuseDetected: "reuse_detected",
  passwordChanged: "password_changed",
  userDisabled: "user_disabled",
} as const;

export const DEFAULT_ROLES = ["user"] as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export type IdentityProvider = (typeof IDENTITY_PROVIDER)[keyof typeof IDENTITY_PROVIDER];
export type ChallengeType = (typeof CHALLENGE_TYPE)[keyof typeof CHALLENGE_TYPE];
export type SessionRevokeReason = (typeof SESSION_REVOKE_REASON)[keyof typeof SESSION_REVOKE_REASON];

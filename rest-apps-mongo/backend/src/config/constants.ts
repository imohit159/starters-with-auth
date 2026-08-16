export const COOKIE = {
  access: "access_token",
  refresh: "refresh_token",
} as const;

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

export const GOOGLE_SCOPES = ["openid", "email", "profile"] as const;

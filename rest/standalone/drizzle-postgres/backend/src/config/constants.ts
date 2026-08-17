export {
  CHALLENGE_TYPE,
  DEFAULT_ROLES,
  IDENTITY_PROVIDER,
  SESSION_REVOKE_REASON,
  USER_STATUS,
} from "../database/constants";

export const COOKIE = {
  access: "access_token",
  refresh: "refresh_token",
} as const;

export const GOOGLE_SCOPES = ["openid", "email", "profile"] as const;

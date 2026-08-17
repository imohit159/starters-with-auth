import {
  and,
  authChallenges,
  authIdentities,
  CHALLENGE_TYPE,
  db,
  eq,
  gt,
  IDENTITY_PROVIDER,
  isNull,
  SESSION_REVOKE_REASON,
  sessions,
  USER_STATUS,
  users,
  type SelectAuthChallenge,
  type SelectUser,
} from "../../database";
import { env } from "../../config/env";
import { GOOGLE_SCOPES } from "../../config/constants";
import { AppError } from "../../shared/errors/app-error";
import {
  generateOpaqueToken,
  hashPassword,
  hashToken,
  newFamilyId,
  signAccessToken,
  verifyPassword,
} from "../../utils/crypto";
import { getGoogleOAuthClient } from "../../utils/google-oauth-client";
import { sendMail } from "../../utils/mailer";
import { toUserOutput } from "../users/model";
import type { LoginInputSchema, RegisterInputSchema, ResetPasswordInputSchema } from "./model";

type RequestMeta = {
  userAgent?: string;
  ip?: string;
};

export type PasswordRegisterDecision =
  | "create"
  | "link_password"
  | "email_taken"
  | "unverified_collision";

export type GoogleAuthDecision = "login" | "create" | "link_google" | "unverified_collision";

/**
 * Determines whether email/password registration should create a user,
 * attach a password identity to an existing verified account, or fail.
 */
export function decidePasswordRegister(input: {
  hasUser: boolean;
  hasPasswordIdentity: boolean;
  emailVerified: boolean;
}): PasswordRegisterDecision {
  if (!input.hasUser) {
    return "create";
  }
  if (input.hasPasswordIdentity) {
    return "email_taken";
  }
  if (input.emailVerified) {
    return "link_password";
  }
  return "unverified_collision";
}

/**
 * Determines whether Google OAuth should sign in, create a user,
 * attach a Google identity to an existing account, or fail.
 */
export function decideGoogleAuth(input: {
  hasGoogleIdentity: boolean;
  hasUserByEmail: boolean;
  googleEmailVerified: boolean;
}): GoogleAuthDecision {
  if (input.hasGoogleIdentity) {
    return "login";
  }
  if (!input.hasUserByEmail) {
    return "create";
  }
  if (input.googleEmailVerified) {
    return "link_google";
  }
  return "unverified_collision";
}

function challengeExpiry(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function refreshExpiry() {
  return new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
}

async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

async function findIdentity(
  provider: (typeof IDENTITY_PROVIDER)[keyof typeof IDENTITY_PROVIDER],
  providerUserId: string,
) {
  const [identity] = await db
    .select()
    .from(authIdentities)
    .where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerUserId, providerUserId)))
    .limit(1);
  return identity ?? null;
}

async function findPasswordIdentityForUser(userId: string) {
  const [identity] = await db
    .select()
    .from(authIdentities)
    .where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, IDENTITY_PROVIDER.password)))
    .limit(1);
  return identity ?? null;
}

/**
 * Issues a new refresh-token family and returns signed access and refresh tokens.
 */
async function issueSession(user: SelectUser, meta: RequestMeta) {
  const refreshToken = generateOpaqueToken();
  await db.insert(sessions).values({
    userId: user.id,
    familyId: newFamilyId(),
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiry(),
    userAgent: meta.userAgent ?? null,
    ip: meta.ip ?? null,
    lastUsedAt: new Date(),
  });
  const [updated] = await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();
  const current = updated ?? user;
  return {
    accessToken: signAccessToken(current.id, current.email),
    refreshToken,
    user: toUserOutput(current),
  };
}

/**
 * Persists a hashed email-verification challenge and delivers the raw token by email.
 */
async function sendVerificationEmail(user: SelectUser) {
  const token = generateOpaqueToken();
  await db.insert(authChallenges).values({
    userId: user.id,
    type: CHALLENGE_TYPE.emailVerification,
    tokenHash: hashToken(token),
    expiresAt: challengeExpiry(24 * 60),
  });
  await sendMail({
    to: user.email,
    subject: "Verify your email",
    text: `Verify your email: ${env.WEB_ORIGIN}/verify-email?token=${token}`,
  });
}

/**
 * Registers a user with email and password.
 * Attaches a password identity to an existing verified Google account when applicable.
 * Always sends a verification email. Omits session tokens when email verification is required.
 */
export async function register(input: RegisterInputSchema, meta: RequestMeta) {
  const existingUser = await findUserByEmail(input.email);
  const passwordIdentity = existingUser ? await findPasswordIdentityForUser(existingUser.id) : null;

  const decision = decidePasswordRegister({
    hasUser: Boolean(existingUser),
    hasPasswordIdentity: Boolean(passwordIdentity),
    emailVerified: Boolean(existingUser?.emailVerifiedAt),
  });

  if (decision === "email_taken") {
    throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
  }
  if (decision === "unverified_collision") {
    throw new AppError(
      409,
      "UNVERIFIED_COLLISION",
      "This email is already associated with an unverified account",
    );
  }

  const passwordHash = await hashPassword(input.password);
  let user = existingUser;

  if (decision === "create") {
    const status = env.REQUIRE_EMAIL_VERIFICATION
      ? USER_STATUS.pendingVerification
      : USER_STATUS.active;
    const [created] = await db
      .insert(users)
      .values({
        email: input.email,
        displayName: input.displayName,
        status,
      })
      .returning();
    user = created;
  }

  if (!user) {
    throw new AppError(500, "INTERNAL_ERROR", "Failed to create user");
  }

  await db.insert(authIdentities).values({
    userId: user.id,
    provider: IDENTITY_PROVIDER.password,
    providerUserId: input.email,
    passwordHash,
    email: input.email,
    emailVerified: Boolean(user.emailVerifiedAt),
  });

  await sendVerificationEmail(user);

  if (env.REQUIRE_EMAIL_VERIFICATION && decision === "create") {
    return { user: toUserOutput(user), tokens: null as null };
  }

  const tokens = await issueSession(user, meta);
  return { user: tokens.user, tokens };
}

/**
 * Authenticates with email and password and issues a new session.
 * Unknown emails and incorrect passwords both fail with 401 to avoid account enumeration.
 */
export async function login(input: LoginInputSchema, meta: RequestMeta) {
  const identity = await findIdentity(IDENTITY_PROVIDER.password, input.email);
  if (!identity?.passwordHash) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const matches = await verifyPassword(identity.passwordHash, input.password);
  if (!matches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const user = await findUserById(identity.userId);
  if (!user || user.status === USER_STATUS.disabled) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
    throw new AppError(403, "EMAIL_NOT_VERIFIED", "Verify your email before signing in");
  }

  return issueSession(user, meta);
}

/**
 * Rotates the refresh token within its family and returns a new token pair.
 * Reuse of a revoked token revokes every session in that family.
 */
export async function refresh(rawRefreshToken: string, meta: RequestMeta) {
  const tokenHash = hashToken(rawRefreshToken);

  return db.transaction(async (tx) => {
    const [session] = await tx.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
    if (!session) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid refresh token");
    }

    if (session.revokedAt) {
      await tx
        .update(sessions)
        .set({
          revokedAt: new Date(),
          revokedReason: SESSION_REVOKE_REASON.reuseDetected,
        })
        .where(and(eq(sessions.familyId, session.familyId), isNull(sessions.revokedAt)));
      throw new AppError(401, "UNAUTHORIZED", "Refresh token reuse detected");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new AppError(401, "UNAUTHORIZED", "Refresh token expired");
    }

    const [user] = await tx.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user || user.status === USER_STATUS.disabled) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid refresh token");
    }

    const nextRefreshToken = generateOpaqueToken();
    const [nextSession] = await tx
      .insert(sessions)
      .values({
        userId: user.id,
        familyId: session.familyId,
        tokenHash: hashToken(nextRefreshToken),
        expiresAt: refreshExpiry(),
        userAgent: meta.userAgent ?? session.userAgent,
        ip: meta.ip ?? session.ip,
        lastUsedAt: new Date(),
      })
      .returning();

    await tx
      .update(sessions)
      .set({
        revokedAt: new Date(),
        revokedReason: SESSION_REVOKE_REASON.rotated,
        replacedBySessionId: nextSession.id,
      })
      .where(eq(sessions.id, session.id));

    return {
      accessToken: signAccessToken(user.id, user.email),
      refreshToken: nextRefreshToken,
      user: toUserOutput(user),
    };
  });
}

/**
 * Revokes the refresh session for the given token.
 * Missing or already-revoked tokens are ignored.
 */
export async function logout(rawRefreshToken: string | undefined) {
  if (!rawRefreshToken) {
    return;
  }
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(rawRefreshToken)))
    .limit(1);
  if (!session || session.revokedAt) {
    return;
  }
  await db
    .update(sessions)
    .set({
      revokedAt: new Date(),
      revokedReason: SESSION_REVOKE_REASON.logout,
    })
    .where(eq(sessions.id, session.id));
}

/**
 * Persists a one-time OAuth state challenge and returns the Google consent URL.
 */
export async function startGoogleAuth() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new AppError(503, "GOOGLE_NOT_CONFIGURED", "Google OAuth is not configured");
  }

  const state = generateOpaqueToken();
  await db.insert(authChallenges).values({
    type: CHALLENGE_TYPE.oauthState,
    tokenHash: hashToken(state),
    expiresAt: challengeExpiry(10),
  });

  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: [...GOOGLE_SCOPES],
    state,
    prompt: "select_account",
  });
}

/**
 * Completes Google OAuth: consumes state, verifies the ID token, then signs in,
 * creates an account, or links Google to an existing user.
 */
export async function googleCallback(code: string | undefined, state: string | undefined, meta: RequestMeta) {
  if (!code || !state) {
    throw new AppError(400, "OAUTH_ERROR", "Missing Google OAuth code or state");
  }

  const [stateChallenge] = await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(authChallenges.tokenHash, hashToken(state)),
        eq(authChallenges.type, CHALLENGE_TYPE.oauthState),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!stateChallenge) {
    throw new AppError(400, "OAUTH_ERROR", "Invalid OAuth state");
  }

  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new AppError(400, "OAUTH_ERROR", "Google did not return an ID token");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new AppError(400, "OAUTH_ERROR", "Google profile is missing email");
  }

  const googleEmail = payload.email.toLowerCase();
  const googleEmailVerified = Boolean(payload.email_verified);
  const existingGoogle = await findIdentity(IDENTITY_PROVIDER.google, payload.sub);
  const existingUser = await findUserByEmail(googleEmail);

  const decision = decideGoogleAuth({
    hasGoogleIdentity: Boolean(existingGoogle),
    hasUserByEmail: Boolean(existingUser),
    googleEmailVerified,
  });

  if (decision === "unverified_collision") {
    throw new AppError(
      409,
      "UNVERIFIED_COLLISION",
      "This email belongs to an existing account and Google did not verify it",
    );
  }

  let user: SelectUser | null = existingGoogle ? await findUserById(existingGoogle.userId) : existingUser;

  if (decision === "create") {
    const [created] = await db
      .insert(users)
      .values({
        email: googleEmail,
        displayName: payload.name ?? googleEmail.split("@")[0] ?? googleEmail,
        avatarUrl: payload.picture ?? null,
        status: USER_STATUS.active,
        emailVerifiedAt: googleEmailVerified ? new Date() : null,
      })
      .returning();
    user = created;
    await db.insert(authIdentities).values({
      userId: user.id,
      provider: IDENTITY_PROVIDER.google,
      providerUserId: payload.sub,
      email: googleEmail,
      emailVerified: googleEmailVerified,
      profile: { picture: payload.picture, locale: payload.locale },
    });
  }

  if (decision === "link_google" && user) {
    await db.insert(authIdentities).values({
      userId: user.id,
      provider: IDENTITY_PROVIDER.google,
      providerUserId: payload.sub,
      email: googleEmail,
      emailVerified: googleEmailVerified,
      profile: { picture: payload.picture, locale: payload.locale },
    });
    const patch: Partial<SelectUser> = {};
    if (!user.emailVerifiedAt && googleEmailVerified) {
      patch.emailVerifiedAt = new Date();
      patch.status = USER_STATUS.active;
    }
    if (!user.avatarUrl && payload.picture) {
      patch.avatarUrl = payload.picture;
    }
    if (Object.keys(patch).length > 0) {
      const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
      user = updated ?? user;
    }
  }

  if (!user || user.status === USER_STATUS.disabled) {
    throw new AppError(401, "UNAUTHORIZED", "Unable to sign in with Google");
  }

  return issueSession(user, meta);
}

/**
 * Sends a password-reset email when a password identity exists for the address.
 * Unknown emails and Google-only accounts produce no error and no mail.
 */
export async function forgotPassword(email: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    return;
  }
  const passwordIdentity = await findPasswordIdentityForUser(user.id);
  if (!passwordIdentity) {
    return;
  }

  const token = generateOpaqueToken();
  await db.insert(authChallenges).values({
    userId: user.id,
    type: CHALLENGE_TYPE.passwordReset,
    tokenHash: hashToken(token),
    expiresAt: challengeExpiry(60),
  });
  await sendMail({
    to: user.email,
    subject: "Reset your password",
    text: `Reset your password: ${env.WEB_ORIGIN}/reset-password?token=${token}`,
  });
}

/**
 * Consumes a one-time reset token, replaces the password hash, and revokes all sessions.
 */
export async function resetPassword(input: ResetPasswordInputSchema) {
  const [challenge] = await db
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.tokenHash, hashToken(input.token)),
        eq(authChallenges.type, CHALLENGE_TYPE.passwordReset),
      ),
    )
    .limit(1);
  if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now() || !challenge.userId) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired reset token");
  }

  await db.update(authChallenges).set({ consumedAt: new Date() }).where(eq(authChallenges.id, challenge.id));

  const identity = await findPasswordIdentityForUser(challenge.userId);
  if (!identity) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired reset token");
  }

  await db
    .update(authIdentities)
    .set({ passwordHash: await hashPassword(input.password) })
    .where(eq(authIdentities.id, identity.id));

  await db
    .update(sessions)
    .set({
      revokedAt: new Date(),
      revokedReason: SESSION_REVOKE_REASON.passwordChanged,
    })
    .where(and(eq(sessions.userId, challenge.userId), isNull(sessions.revokedAt)));
}

/**
 * Consumes a one-time verification token and marks the user and matching identities as verified.
 */
export async function verifyEmail(token: string) {
  const [challenge] = await db
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.tokenHash, hashToken(token)),
        eq(authChallenges.type, CHALLENGE_TYPE.emailVerification),
      ),
    )
    .limit(1);
  if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now() || !challenge.userId) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired verification token");
  }

  await db.update(authChallenges).set({ consumedAt: new Date() }).where(eq(authChallenges.id, challenge.id));

  const user = await findUserById(challenge.userId);
  if (!user) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired verification token");
  }

  const [updated] = await db
    .update(users)
    .set({
      emailVerifiedAt: new Date(),
      status: user.status === USER_STATUS.pendingVerification ? USER_STATUS.active : user.status,
    })
    .where(eq(users.id, user.id))
    .returning();

  await db
    .update(authIdentities)
    .set({ emailVerified: true })
    .where(and(eq(authIdentities.userId, user.id), eq(authIdentities.email, user.email)));

  return toUserOutput(updated ?? { ...user, emailVerifiedAt: new Date() });
}

/**
 * Marks a hashed challenge as consumed.
 * Throws if the token is missing, expired, or has already been used.
 */
export async function consumeChallengeOnce(
  token: string,
  type: (typeof CHALLENGE_TYPE)[keyof typeof CHALLENGE_TYPE],
): Promise<SelectAuthChallenge> {
  const [challenge] = await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(authChallenges.tokenHash, hashToken(token)),
        eq(authChallenges.type, type),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!challenge) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired token");
  }
  return challenge;
}

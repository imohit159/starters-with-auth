import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";
import {
  authChallenges,
  authIdentities,
  CHALLENGE_TYPE,
  db,
  IDENTITY_PROVIDER,
  SESSION_REVOKE_REASON,
  sessions,
  USER_STATUS,
  users,
  type SelectAuthChallenge,
  type SelectSession,
  type SelectUser,
} from "@/server/db";
import { AppError } from "@/server/logger";
import { toUserOutput, type UserOutputSchema } from "../users/model";
import { getGoogleOAuthClient, GOOGLE_SCOPES } from "../../clients/google-oauth-client";
import {
  equalizePasswordTiming,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  newFamilyId,
  signAccessToken,
  verifyPassword,
} from "./crypto";
import { env } from "../../env";
import { sendMail } from "../../clients/mailer";
import type {
  ChangePasswordInputSchema,
  LoginInputSchema,
  RegisterInputSchema,
  ResetPasswordInputSchema,
  SessionOutputSchema,
} from "./model";

export * from "./crypto";
export * from "./model";

type RequestMeta = {
  userAgent?: string;
  ip?: string;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  user: UserOutputSchema;
};

/**
 * Register outcomes.
 * `password_setup_sent` deliberately carries no user object: the caller has not
 * proven it controls the address, so it learns nothing beyond "mail was sent".
 */
export type RegisterResult =
  | { status: "session"; user: UserOutputSchema; tokens: SessionTokens }
  | { status: "verification_sent"; user: UserOutputSchema; tokens: null }
  | { status: "password_setup_sent"; user: null; tokens: null };

export type PasswordRegisterDecision =
  | "create"
  | "send_password_setup"
  | "email_taken"
  | "unverified_collision";

export type GoogleAuthDecision = "login" | "create" | "link_google" | "unverified_collision";

/**
 * Determines how email/password registration should treat the address.
 *
 * A verified account with no password identity does NOT get one attached here.
 * Whoever is calling has only supplied an email address, so the only safe move
 * is to mail the account owner a set-password link and hand the caller nothing.
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
    return "send_password_setup";
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

async function findIdentity(provider: (typeof IDENTITY_PROVIDER)[keyof typeof IDENTITY_PROVIDER], providerUserId: string) {
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
async function issueSession(user: SelectUser, meta: RequestMeta): Promise<SessionTokens> {
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
    text: `Verify your email: ${env.APP_URL}/verify-email?token=${token}`,
  });
}

/**
 * Mails a one-time link that lets an existing account add a password.
 * Used when someone tries to register an address that already signs in with Google.
 */
async function sendPasswordSetupEmail(user: SelectUser) {
  const token = generateOpaqueToken();
  await db.insert(authChallenges).values({
    userId: user.id,
    type: CHALLENGE_TYPE.passwordReset,
    tokenHash: hashToken(token),
    expiresAt: challengeExpiry(60),
  });
  await sendMail({
    to: user.email,
    subject: "Set a password for your account",
    text:
      "Someone tried to register an account with this email address. " +
      "Your account already exists and signs in with Google.\n\n" +
      `If that was you and you want a password as well, set one here: ${env.APP_URL}/reset-password?token=${token}\n\n` +
      "If it was not you, ignore this email. Nothing has changed and your account is untouched.",
  });
}

/**
 * Registers a user with email and password.
 *
 * When the address already belongs to a verified passwordless account, no
 * credential is written and no session is issued; the owner is mailed a
 * set-password link instead. Attaching a caller-chosen password to an existing
 * account on request alone would be an account takeover.
 */
export async function register(input: RegisterInputSchema, meta: RequestMeta): Promise<RegisterResult> {
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
  if (decision === "send_password_setup") {
    await sendPasswordSetupEmail(existingUser as SelectUser);
    return { status: "password_setup_sent", user: null, tokens: null };
  }

  const passwordHash = await hashPassword(input.password);
  const status = env.REQUIRE_EMAIL_VERIFICATION
    ? USER_STATUS.pendingVerification
    : USER_STATUS.active;

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      displayName: input.displayName,
      status,
    })
    .returning();

  if (!user) {
    throw new AppError(500, "INTERNAL_ERROR", "Failed to create user");
  }

  await db.insert(authIdentities).values({
    userId: user.id,
    provider: IDENTITY_PROVIDER.password,
    providerUserId: input.email,
    passwordHash,
    email: input.email,
    emailVerified: false,
  });

  await sendVerificationEmail(user);

  if (env.REQUIRE_EMAIL_VERIFICATION) {
    return { status: "verification_sent", user: toUserOutput(user), tokens: null };
  }

  const tokens = await issueSession(user, meta);
  return { status: "session", user: tokens.user, tokens };
}

/**
 * Authenticates with email and password and issues a new session.
 * Unknown emails and incorrect passwords both fail with 401 after the same
 * amount of Argon2 work, so neither the response nor its timing reveals which.
 */
export async function login(input: LoginInputSchema, meta: RequestMeta) {
  const identity = await findIdentity(IDENTITY_PROVIDER.password, input.email);
  if (!identity?.passwordHash) {
    await equalizePasswordTiming(input.password);
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

  const result = await db.transaction(async (tx) => {
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
      return { kind: "reuse" as const };
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new AppError(401, "UNAUTHORIZED", "Refresh token expired");
    }

    const [claimed] = await tx
      .update(sessions)
      .set({ revokedAt: new Date(), revokedReason: SESSION_REVOKE_REASON.rotated })
      .where(and(eq(sessions.id, session.id), isNull(sessions.revokedAt)))
      .returning();
    if (!claimed) {
      await tx
        .update(sessions)
        .set({ revokedAt: new Date(), revokedReason: SESSION_REVOKE_REASON.reuseDetected })
        .where(and(eq(sessions.familyId, session.familyId), isNull(sessions.revokedAt)));
      return { kind: "reuse" as const };
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
        replacedBySessionId: nextSession.id,
      })
      .where(eq(sessions.id, session.id));

    return { kind: "success" as const,
      accessToken: signAccessToken(user.id, user.email),
      refreshToken: nextRefreshToken,
      user: toUserOutput(user),
    };
  });

  if (result.kind === "reuse") {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token reuse detected");
  }
  return result;
}

/**
 * Revokes the refresh session for the given token.
 * Missing or already-revoked tokens are ignored.
 */
export async function logout(rawRefreshToken: string | undefined) {
  if (!rawRefreshToken) {
    return;
  }
  await db
    .update(sessions)
    .set({
      revokedAt: new Date(),
      revokedReason: SESSION_REVOKE_REASON.logout,
    })
    .where(and(eq(sessions.tokenHash, hashToken(rawRefreshToken)), isNull(sessions.revokedAt)));
}

function toSessionOutput(session: SelectSession, currentTokenHash?: string): SessionOutputSchema {
  return {
    id: session.id,
    current: currentTokenHash ? session.tokenHash === currentTokenHash : false,
    userAgent: session.userAgent,
    ip: session.ip,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt ? session.lastUsedAt.toISOString() : null,
    expiresAt: session.expiresAt.toISOString(),
  };
}

/** Lists the caller's live sessions, newest activity first, flagging the current one. */
export async function listSessions(userId: string, rawRefreshToken?: string) {
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(sessions.lastUsedAt));
  const currentTokenHash = rawRefreshToken ? hashToken(rawRefreshToken) : undefined;
  return rows.map((row) => toSessionOutput(row, currentTokenHash));
}

/**
 * Revokes every live session for a user except the one presenting `keepToken`.
 * Returns how many were revoked so the caller can report it.
 */
export async function revokeOtherSessions(userId: string, keepToken?: string) {
  const conditions = [eq(sessions.userId, userId), isNull(sessions.revokedAt)];
  if (keepToken) {
    conditions.push(ne(sessions.tokenHash, hashToken(keepToken)));
  }
  const revoked = await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: SESSION_REVOKE_REASON.logout })
    .where(and(...conditions))
    .returning({ id: sessions.id });
  return revoked.length;
}

/**
 * Changes the password of an authenticated user.
 * Every existing session is revoked and a fresh one is issued, so the caller
 * stays signed in on this device while all other devices are signed out.
 */
export async function changePassword(
  userId: string,
  input: ChangePasswordInputSchema,
  meta: RequestMeta,
) {
  const user = await findUserById(userId);
  if (!user || user.status === USER_STATUS.disabled) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const identity = await findPasswordIdentityForUser(userId);
  if (!identity?.passwordHash) {
    throw new AppError(
      400,
      "NO_PASSWORD_IDENTITY",
      "This account has no password yet. Use the forgot-password flow to set one.",
    );
  }

  const matches = await verifyPassword(identity.passwordHash, input.currentPassword);
  if (!matches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect");
  }

  await db
    .update(authIdentities)
    .set({ passwordHash: await hashPassword(input.newPassword) })
    .where(eq(authIdentities.id, identity.id));

  await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: SESSION_REVOKE_REASON.passwordChanged })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

  return issueSession(user, meta);
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

  try {
    await consumeChallengeOnce(state, CHALLENGE_TYPE.oauthState);
  } catch {
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
 * Sends a password-reset email when an account exists for the address.
 * Unknown emails produce no error and no mail. Passwordless accounts get a link
 * too, since setting a first password from a mailed token is safe.
 */
export async function forgotPassword(email: string) {
  const user = await findUserByEmail(email);
  if (!user || user.status === USER_STATUS.disabled) {
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
    text: `Reset your password: ${env.APP_URL}/reset-password?token=${token}`,
  });
}

/**
 * Consumes a one-time reset token, sets the password hash, and revokes all sessions.
 * Creates the password identity when the account previously had none, which is
 * how a Google-only account gains a password: from a token mailed to its address.
 */
export async function resetPassword(input: ResetPasswordInputSchema) {
  const challenge = await consumeChallengeOnce(input.token, CHALLENGE_TYPE.passwordReset);
  if (!challenge.userId) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired reset token");
  }

  const user = await findUserById(challenge.userId);
  if (!user) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired reset token");
  }

  const passwordHash = await hashPassword(input.password);
  const identity = await findPasswordIdentityForUser(user.id);

  if (identity) {
    await db
      .update(authIdentities)
      .set({ passwordHash })
      .where(eq(authIdentities.id, identity.id));
  } else {
    await db.insert(authIdentities).values({
      userId: user.id,
      provider: IDENTITY_PROVIDER.password,
      providerUserId: user.email,
      passwordHash,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
    });
  }

  await db
    .update(sessions)
    .set({
      revokedAt: new Date(),
      revokedReason: SESSION_REVOKE_REASON.passwordChanged,
    })
    .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt)));
}

/**
 * Consumes a one-time verification token and marks the user and matching identities as verified.
 */
export async function verifyEmail(token: string) {
  const challenge = await consumeChallengeOnce(token, CHALLENGE_TYPE.emailVerification);
  if (!challenge.userId) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired verification token");
  }

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
 * The guard and the write are one statement, so two concurrent callers cannot
 * both pass. Throws if the token is missing, expired, or already used.
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

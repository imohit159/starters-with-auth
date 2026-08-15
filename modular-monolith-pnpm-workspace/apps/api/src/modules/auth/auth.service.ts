import {
  CHALLENGE_TYPE,
  GOOGLE_SCOPES,
  IDENTITY_PROVIDER,
  SESSION_REVOKE_REASON,
  USER_STATUS,
} from "../../config/constants";
import { env } from "../../config/env";
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
import { toPublicUser } from "../users/users.dto";
import { User, type UserDocument } from "../users/user.model";
import { AuthChallenge } from "./challenge.model";
import { AuthIdentity } from "./identity.model";
import { Session } from "./session.model";
import type { LoginDto, RegisterDto, ResetPasswordDto } from "./auth.dto";

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

async function issueSession(user: UserDocument, meta: RequestMeta) {
  const refreshToken = generateOpaqueToken();
  await Session.create({
    userId: user._id,
    familyId: newFamilyId(),
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiry(),
    userAgent: meta.userAgent ?? null,
    ip: meta.ip ?? null,
    lastUsedAt: new Date(),
  });
  user.lastLoginAt = new Date();
  await user.save();
  return {
    accessToken: signAccessToken(user._id.toString(), user.email),
    refreshToken,
    user: toPublicUser(user),
  };
}

async function sendVerificationEmail(user: UserDocument) {
  const token = generateOpaqueToken();
  await AuthChallenge.create({
    userId: user._id,
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

export async function register(input: RegisterDto, meta: RequestMeta) {
  const existingUser = await User.findOne({ email: input.email });
  const passwordIdentity = existingUser
    ? await AuthIdentity.findOne({
        userId: existingUser._id,
        provider: IDENTITY_PROVIDER.password,
      })
    : null;

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
    user = await User.create({
      email: input.email,
      displayName: input.displayName,
      status,
    });
  }

  if (!user) {
    throw new AppError(500, "INTERNAL_ERROR", "Failed to create user");
  }

  await AuthIdentity.create({
    userId: user._id,
    provider: IDENTITY_PROVIDER.password,
    providerUserId: input.email,
    passwordHash,
    email: input.email,
    emailVerified: Boolean(user.emailVerifiedAt),
  });

  await sendVerificationEmail(user);

  if (env.REQUIRE_EMAIL_VERIFICATION && decision === "create") {
    return { user: toPublicUser(user), tokens: null as null };
  }

  const tokens = await issueSession(user, meta);
  return { user: tokens.user, tokens };
}

export async function login(input: LoginDto, meta: RequestMeta) {
  const identity = await AuthIdentity.findOne({
    provider: IDENTITY_PROVIDER.password,
    providerUserId: input.email,
  });
  if (!identity?.passwordHash) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const matches = await verifyPassword(identity.passwordHash, input.password);
  if (!matches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const user = await User.findById(identity.userId);
  if (!user || user.status === USER_STATUS.disabled) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
    throw new AppError(403, "EMAIL_NOT_VERIFIED", "Verify your email before signing in");
  }

  return issueSession(user, meta);
}

export async function refresh(rawRefreshToken: string, meta: RequestMeta) {
  const tokenHash = hashToken(rawRefreshToken);
  const session = await Session.findOne({ tokenHash });
  if (!session) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid refresh token");
  }

  if (session.revokedAt) {
    await Session.updateMany(
      { familyId: session.familyId, revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: SESSION_REVOKE_REASON.reuseDetected,
        },
      },
    );
    throw new AppError(401, "UNAUTHORIZED", "Refresh token reuse detected");
  }

  if (session.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token expired");
  }

  const user = await User.findById(session.userId);
  if (!user || user.status === USER_STATUS.disabled) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid refresh token");
  }

  const nextRefreshToken = generateOpaqueToken();
  const nextSession = await Session.create({
    userId: user._id,
    familyId: session.familyId,
    tokenHash: hashToken(nextRefreshToken),
    expiresAt: refreshExpiry(),
    userAgent: meta.userAgent ?? session.userAgent,
    ip: meta.ip ?? session.ip,
    lastUsedAt: new Date(),
  });

  session.revokedAt = new Date();
  session.revokedReason = SESSION_REVOKE_REASON.rotated;
  session.replacedBySessionId = nextSession._id;
  await session.save();

  return {
    accessToken: signAccessToken(user._id.toString(), user.email),
    refreshToken: nextRefreshToken,
    user: toPublicUser(user),
  };
}

export async function logout(rawRefreshToken: string | undefined) {
  if (!rawRefreshToken) {
    return;
  }
  const session = await Session.findOne({ tokenHash: hashToken(rawRefreshToken) });
  if (!session || session.revokedAt) {
    return;
  }
  session.revokedAt = new Date();
  session.revokedReason = SESSION_REVOKE_REASON.logout;
  await session.save();
}

export async function startGoogleAuth() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new AppError(503, "GOOGLE_NOT_CONFIGURED", "Google OAuth is not configured");
  }

  const state = generateOpaqueToken();
  await AuthChallenge.create({
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

export async function googleCallback(code: string | undefined, state: string | undefined, meta: RequestMeta) {
  if (!code || !state) {
    throw new AppError(400, "OAUTH_ERROR", "Missing Google OAuth code or state");
  }

  const stateChallenge = await AuthChallenge.findOne({
    tokenHash: hashToken(state),
    type: CHALLENGE_TYPE.oauthState,
  });
  if (!stateChallenge || stateChallenge.consumedAt || stateChallenge.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "OAUTH_ERROR", "Invalid OAuth state");
  }
  stateChallenge.consumedAt = new Date();
  await stateChallenge.save();

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
  const existingGoogle = await AuthIdentity.findOne({
    provider: IDENTITY_PROVIDER.google,
    providerUserId: payload.sub,
  });
  const existingUser = await User.findOne({ email: googleEmail });

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

  let user: UserDocument | null = existingGoogle
    ? await User.findById(existingGoogle.userId)
    : existingUser;

  if (decision === "create") {
    user = await User.create({
      email: googleEmail,
      displayName: payload.name ?? googleEmail.split("@")[0],
      avatarUrl: payload.picture ?? null,
      status: USER_STATUS.active,
      emailVerifiedAt: googleEmailVerified ? new Date() : null,
    });
    await AuthIdentity.create({
      userId: user._id,
      provider: IDENTITY_PROVIDER.google,
      providerUserId: payload.sub,
      email: googleEmail,
      emailVerified: googleEmailVerified,
      profile: { picture: payload.picture, locale: payload.locale },
    });
  }

  if (decision === "link_google" && user) {
    await AuthIdentity.create({
      userId: user._id,
      provider: IDENTITY_PROVIDER.google,
      providerUserId: payload.sub,
      email: googleEmail,
      emailVerified: googleEmailVerified,
      profile: { picture: payload.picture, locale: payload.locale },
    });
    if (!user.emailVerifiedAt && googleEmailVerified) {
      user.emailVerifiedAt = new Date();
      user.status = USER_STATUS.active;
    }
    if (!user.avatarUrl && payload.picture) {
      user.avatarUrl = payload.picture;
    }
    await user.save();
  }

  if (!user || user.status === USER_STATUS.disabled) {
    throw new AppError(401, "UNAUTHORIZED", "Unable to sign in with Google");
  }

  return issueSession(user, meta);
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email });
  if (!user) {
    return;
  }
  const passwordIdentity = await AuthIdentity.findOne({
    userId: user._id,
    provider: IDENTITY_PROVIDER.password,
  });
  if (!passwordIdentity) {
    return;
  }

  const token = generateOpaqueToken();
  await AuthChallenge.create({
    userId: user._id,
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

export async function resetPassword(input: ResetPasswordDto) {
  const challenge = await AuthChallenge.findOne({
    tokenHash: hashToken(input.token),
    type: CHALLENGE_TYPE.passwordReset,
  });
  if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now() || !challenge.userId) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired reset token");
  }

  challenge.consumedAt = new Date();
  await challenge.save();

  const identity = await AuthIdentity.findOne({
    userId: challenge.userId,
    provider: IDENTITY_PROVIDER.password,
  });
  if (!identity) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired reset token");
  }

  identity.passwordHash = await hashPassword(input.password);
  await identity.save();

  await Session.updateMany(
    { userId: challenge.userId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: SESSION_REVOKE_REASON.passwordChanged,
      },
    },
  );
}

export async function verifyEmail(token: string) {
  const challenge = await AuthChallenge.findOne({
    tokenHash: hashToken(token),
    type: CHALLENGE_TYPE.emailVerification,
  });
  if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now() || !challenge.userId) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired verification token");
  }

  const alreadyConsumed = Boolean(challenge.consumedAt);
  if (alreadyConsumed) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired verification token");
  }

  challenge.consumedAt = new Date();
  await challenge.save();

  const user = await User.findById(challenge.userId);
  if (!user) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired verification token");
  }

  user.emailVerifiedAt = new Date();
  if (user.status === USER_STATUS.pendingVerification) {
    user.status = USER_STATUS.active;
  }
  await user.save();

  await AuthIdentity.updateMany(
    { userId: user._id, email: user.email },
    { $set: { emailVerified: true } },
  );

  return toPublicUser(user);
}

export async function consumeChallengeOnce(
  token: string,
  type: (typeof CHALLENGE_TYPE)[keyof typeof CHALLENGE_TYPE],
) {
  const challenge = await AuthChallenge.findOne({ tokenHash: hashToken(token), type });
  if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired token");
  }
  challenge.consumedAt = new Date();
  await challenge.save();
  return challenge;
}

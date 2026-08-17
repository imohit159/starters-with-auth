import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  authChallenges,
  authIdentities,
  CHALLENGE_TYPE,
  db,
  IDENTITY_PROVIDER,
  users,
} from "@/server/db";
import {
  changePassword,
  consumeChallengeOnce,
  generateOpaqueToken,
  hashToken,
  listSessions,
  login,
  refresh,
  register,
  resetPassword,
  revokeOtherSessions,
  verifyEmail,
} from "@/server/modules/auth";
import { enforceAuthRateLimit, enforceSubjectRateLimit } from "@/server/http/rate-limit";
import {
  claimChallengeToken,
  findPasswordIdentity,
  findSessionsByUserId,
  findUserByEmail,
  isDockerAvailable,
  resetTestDb,
  seedGoogleOnlyUser,
  startTestDb,
  stopTestDb,
} from "../helpers/db";

const dockerAvailable = isDockerAvailable();

describe.skipIf(!dockerAvailable)("persistence", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  it("enforces unique user emails", async () => {
    await db.insert(users).values({ email: "dup@example.com", displayName: "A" });
    await expect(db.insert(users).values({ email: "dup@example.com", displayName: "B" })).rejects.toThrow();
  });

  it("enforces unique provider + providerUserId", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "one@example.com", displayName: "One" })
      .returning();
    await db.insert(authIdentities).values({
      userId: user.id,
      provider: IDENTITY_PROVIDER.password,
      providerUserId: "one@example.com",
      email: "one@example.com",
    });
    await expect(
      db.insert(authIdentities).values({
        userId: user.id,
        provider: IDENTITY_PROVIDER.password,
        providerUserId: "one@example.com",
        email: "one@example.com",
      }),
    ).rejects.toThrow();
  });

  it("rotates a session and keeps the family id", async () => {
    const result = await register(
      { email: "rotate@example.com", password: "password12", displayName: "Rot" },
      {},
    );
    expect(result.tokens).not.toBeNull();
    const rotated = await refresh(result.tokens!.refreshToken, {});
    expect(rotated.refreshToken).not.toBe(result.tokens!.refreshToken);

    const rows = await findSessionsByUserId(result.user!.id);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((session) => session.familyId)).size).toBe(1);
    expect(rows.filter((session) => session.revokedAt)).toHaveLength(1);
  });

  it("allows only one successor for concurrent refresh attempts", async () => {
    const result = await register(
      { email: "race@example.com", password: "password12", displayName: "Race" },
      {},
    );
    const attempts = await Promise.allSettled([
      refresh(result.tokens!.refreshToken, {}),
      refresh(result.tokens!.refreshToken, {}),
    ]);
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
  });

  it("consumes an auth challenge only once", async () => {
    const token = generateOpaqueToken();
    const [user] = await db.insert(users).values({ email: "ch@example.com", displayName: "Ch" }).returning();
    await db.insert(authChallenges).values({
      userId: user.id,
      type: CHALLENGE_TYPE.emailVerification,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await consumeChallengeOnce(token, CHALLENGE_TYPE.emailVerification);
    await expect(consumeChallengeOnce(token, CHALLENGE_TYPE.emailVerification)).rejects.toMatchObject({
      code: "INVALID_TOKEN",
    });
  });

  it("never issues a session when registering against a passwordless account", async () => {
    // Account-takeover regression. Knowing the address is not proof of owning it.
    const victim = await seedGoogleOnlyUser("victim@example.com", "Victim");

    const result = await register(
      { email: "victim@example.com", password: "attacker-chosen", displayName: "Attacker" },
      {},
    );

    expect(result.status).toBe("password_setup_sent");
    expect(result.tokens).toBeNull();
    expect(result.user).toBeNull();
    expect(await findPasswordIdentity(victim.id)).toBeNull();
    expect(await findSessionsByUserId(victim.id)).toHaveLength(0);
    await expect(
      login({ email: "victim@example.com", password: "attacker-chosen" }, {}),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("lets the owner set a first password from a mailed reset token", async () => {
    const user = await seedGoogleOnlyUser("owner@example.com", "Owner");
    await register(
      { email: "owner@example.com", password: "ignored-value", displayName: "Someone" },
      {},
    );

    const token = generateOpaqueToken();
    await claimChallengeToken(CHALLENGE_TYPE.passwordReset, hashToken(token));
    await resetPassword({ token, password: "owner-chosen-pass" });

    expect(await findPasswordIdentity(user.id)).not.toBeNull();
    const session = await login({ email: "owner@example.com", password: "owner-chosen-pass" }, {});
    expect(session.user.id).toBe(user.id);
  });

  it("rejects a reset token replayed concurrently", async () => {
    await register({ email: "replay@example.com", password: "password12", displayName: "Rep" }, {});
    const user = await findUserByEmail("replay@example.com");
    const token = generateOpaqueToken();
    await db.insert(authChallenges).values({
      userId: user!.id,
      type: CHALLENGE_TYPE.passwordReset,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const attempts = await Promise.allSettled([
      resetPassword({ token, password: "first-new-password" }),
      resetPassword({ token, password: "second-new-password" }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
  });

  it("revokes every session when a password is reset", async () => {
    const result = await register(
      { email: "revoke@example.com", password: "password12", displayName: "Rev" },
      {},
    );
    const token = generateOpaqueToken();
    const user = await findUserByEmail("revoke@example.com");
    await db.insert(authChallenges).values({
      userId: user!.id,
      type: CHALLENGE_TYPE.passwordReset,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await resetPassword({ token, password: "brand-new-password" });

    await expect(refresh(result.tokens!.refreshToken, {})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("verifies an email and activates a pending user", async () => {
    const result = await register(
      { email: "verify@example.com", password: "password12", displayName: "Ver" },
      {},
    );
    const token = generateOpaqueToken();
    await claimChallengeToken(CHALLENGE_TYPE.emailVerification, hashToken(token));

    const verified = await verifyEmail(token);
    expect(verified.emailVerifiedAt).not.toBeNull();
    expect(verified.id).toBe(result.user!.id);

    const identity = await findPasswordIdentity(result.user!.id);
    expect(identity?.emailVerified).toBe(true);
  });

  it("keeps this device and drops the rest on change-password", async () => {
    const first = await register(
      { email: "change@example.com", password: "password12", displayName: "Chg" },
      { userAgent: "device-one" },
    );
    await login({ email: "change@example.com", password: "password12" }, { userAgent: "device-two" });

    const rotated = await changePassword(
      first.user!.id,
      { currentPassword: "password12", newPassword: "password-thirteen" },
      { userAgent: "device-one" },
    );

    // Old refresh tokens from both devices are gone; the returned one works.
    await expect(refresh(first.tokens!.refreshToken, {})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    const live = await listSessions(first.user!.id, rotated.refreshToken);
    expect(live).toHaveLength(1);
    expect(live[0].current).toBe(true);

    await expect(
      login({ email: "change@example.com", password: "password12" }, {}),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(
      login({ email: "change@example.com", password: "password-thirteen" }, {}),
    ).resolves.toBeTruthy();
  });

  it("rejects change-password with the wrong current password", async () => {
    const result = await register(
      { email: "wrong@example.com", password: "password12", displayName: "Wrg" },
      {},
    );
    await expect(
      changePassword(result.user!.id, { currentPassword: "nope", newPassword: "password34" }, {}),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
  });

  it("refuses change-password on an account with no password identity", async () => {
    const user = await seedGoogleOnlyUser("nopass@example.com");
    await expect(
      changePassword(user.id, { currentPassword: "any", newPassword: "password34" }, {}),
    ).rejects.toMatchObject({ code: "NO_PASSWORD_IDENTITY" });
  });

  it("lists live sessions and signs out the others", async () => {
    const first = await register(
      { email: "many@example.com", password: "password12", displayName: "Many" },
      { userAgent: "one" },
    );
    await login({ email: "many@example.com", password: "password12" }, { userAgent: "two" });
    await login({ email: "many@example.com", password: "password12" }, { userAgent: "three" });

    const before = await listSessions(first.user!.id, first.tokens!.refreshToken);
    expect(before).toHaveLength(3);
    expect(before.filter((session) => session.current)).toHaveLength(1);

    const revoked = await revokeOtherSessions(first.user!.id, first.tokens!.refreshToken);
    expect(revoked).toBe(2);

    const after = await listSessions(first.user!.id, first.tokens!.refreshToken);
    expect(after).toHaveLength(1);
    expect(after[0].current).toBe(true);
  });

  it("enforces an atomic PostgreSQL rate-limit window", async () => {
    const request = new Request("http://localhost/api/v1/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    await enforceAuthRateLimit(request, "integration", { limit: 2, enforceInTest: true });
    await enforceAuthRateLimit(request, "integration", { limit: 2, enforceInTest: true });
    await expect(
      enforceAuthRateLimit(request, "integration", { limit: 2, enforceInTest: true }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", statusCode: 429 });
  });

  it("caps attempts per account regardless of source address", async () => {
    const options = { limit: 2, enforceInTest: true };
    await enforceSubjectRateLimit("target@example.com", "login", options);
    await enforceSubjectRateLimit("target@example.com", "login", options);
    await expect(
      enforceSubjectRateLimit("target@example.com", "login", options),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });

    // A different account keeps its own budget.
    await expect(
      enforceSubjectRateLimit("bystander@example.com", "login", options),
    ).resolves.toBeTruthy();
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  authChallenges,
  authIdentities,
  CHALLENGE_TYPE,
  db,
  IDENTITY_PROVIDER,
  users,
} from "@/server/db";
import { consumeChallengeOnce, generateOpaqueToken, hashToken, refresh, register } from "@/server/modules/auth";
import { enforceAuthRateLimit } from "@/server/http/rate-limit";
import { findSessionsByUserId, isDockerAvailable, resetTestDb, startTestDb, stopTestDb } from "../helpers/db";

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

    const rows = await findSessionsByUserId(result.user.id);
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
});

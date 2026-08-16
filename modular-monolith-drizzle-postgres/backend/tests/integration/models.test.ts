import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  authChallenges,
  authIdentities,
  CHALLENGE_TYPE,
  db,
  IDENTITY_PROVIDER,
  users,
} from "../../src/database";
import { consumeChallengeOnce, refresh, register } from "../../src/modules/auth/auth.service";
import { generateOpaqueToken, hashToken } from "../../src/utils/crypto";
import { findSessionsByUserId, isDockerAvailable, resetTestDb, startTestDb, stopTestDb } from "../helpers/db";

describe.skipIf(!isDockerAvailable())("persistence", () => {
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
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  AuthChallenge,
  AuthIdentity,
  CHALLENGE_TYPE,
  IDENTITY_PROVIDER,
  Session,
  User,
} from "../../src/database";
import { consumeChallengeOnce, refresh, register } from "../../src/modules/auth/auth.service";
import { generateOpaqueToken, hashToken } from "../../src/utils/crypto";
import { resetTestDb, startTestDb, stopTestDb } from "../helpers/db";

describe("persistence", () => {
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
    await User.create({ email: "dup@example.com", displayName: "A" });
    await expect(User.create({ email: "dup@example.com", displayName: "B" })).rejects.toThrow();
  });

  it("enforces unique provider + providerUserId", async () => {
    const user = await User.create({ email: "one@example.com", displayName: "One" });
    await AuthIdentity.create({
      userId: user._id,
      provider: IDENTITY_PROVIDER.password,
      providerUserId: "one@example.com",
      email: "one@example.com",
    });
    await expect(
      AuthIdentity.create({
        userId: user._id,
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

    const sessions = await Session.find({ userId: result.user.id });
    expect(sessions).toHaveLength(2);
    expect(new Set(sessions.map((session) => session.familyId)).size).toBe(1);
    expect(sessions.filter((session) => session.revokedAt)).toHaveLength(1);
  });

  it("consumes an auth challenge only once", async () => {
    const token = generateOpaqueToken();
    const user = await User.create({ email: "ch@example.com", displayName: "Ch" });
    await AuthChallenge.create({
      userId: user._id,
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

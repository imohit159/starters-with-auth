import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
  decideGoogleAuth,
  decidePasswordRegister,
  equalizePasswordTiming,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from "@/server/modules/auth";
import { durationToSeconds, env } from "@/server/env";
import { parseAllowedOrigins } from "@/lib/origins";

describe("crypto", () => {
  it("hashes and verifies a password with argon2id", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "correct-horse-battery")).toBe(true);
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("issues and verifies an access JWT", () => {
    const token = signAccessToken("user-1", "a@example.com");
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("a@example.com");
  });

  it("pins the signing algorithm to HS256", () => {
    const decoded = jwt.decode(signAccessToken("user-1", "a@example.com"), { complete: true });
    expect(decoded?.header.alg).toBe("HS256");
  });

  it("rejects an unsigned token that claims alg none", () => {
    const forged = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(
      JSON.stringify({ sub: "user-1", email: "a@example.com" }),
    ).toString("base64url")}.`;
    expect(() => verifyAccessToken(forged)).toThrow(/Invalid or expired access token/);
  });

  it("rejects a token minted for another issuer", () => {
    const foreign = jwt.sign({ sub: "user-1", email: "a@example.com" }, env.ACCESS_TOKEN_SECRET, {
      algorithm: "HS256",
      issuer: "https://evil.example",
      audience: env.APP_URL,
    });
    expect(() => verifyAccessToken(foreign)).toThrow(/Invalid or expired access token/);
  });

  it("hashes opaque tokens deterministically", () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(hashToken(`${token}x`));
  });

  it("burns argon2 work when no identity was found", async () => {
    await expect(equalizePasswordTiming("anything")).resolves.toBeUndefined();
  });
});

describe("env parsing", () => {
  it("converts jwt durations to seconds", () => {
    expect(durationToSeconds("15m")).toBe(900);
    expect(durationToSeconds("2h")).toBe(7_200);
    expect(durationToSeconds("7d")).toBe(604_800);
    expect(durationToSeconds("later")).toBeNull();
  });

  it("keeps the access cookie lifetime aligned with the token lifetime", () => {
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(durationToSeconds(env.ACCESS_TOKEN_EXPIRES_IN));
  });

  it("always trusts APP_URL and dedupes extra origins", () => {
    expect(parseAllowedOrigins("http://localhost:3000", "")).toEqual(["http://localhost:3000"]);
    expect(
      parseAllowedOrigins("https://app.example.com", "https://admin.example.com/, https://app.example.com"),
    ).toEqual(["https://app.example.com", "https://admin.example.com"]);
    expect(() => parseAllowedOrigins("https://app.example.com", "not-a-url")).toThrow();
  });
});

describe("identity linking rules", () => {
  it("creates a new password user when email is free", () => {
    expect(
      decidePasswordRegister({ hasUser: false, hasPasswordIdentity: false, emailVerified: false }),
    ).toBe("create");
  });

  it("rejects a second password identity", () => {
    expect(
      decidePasswordRegister({ hasUser: true, hasPasswordIdentity: true, emailVerified: true }),
    ).toBe("email_taken");
  });

  it("never attaches a caller-chosen password to an existing verified account", () => {
    // Registering against a Google-only account must not mint a credential for
    // the caller. The owner gets a set-password link; the caller gets nothing.
    expect(
      decidePasswordRegister({ hasUser: true, hasPasswordIdentity: false, emailVerified: true }),
    ).toBe("send_password_setup");
  });

  it("rejects password register against an unverified existing user", () => {
    expect(
      decidePasswordRegister({ hasUser: true, hasPasswordIdentity: false, emailVerified: false }),
    ).toBe("unverified_collision");
  });

  it("logs in when a Google identity already exists", () => {
    expect(
      decideGoogleAuth({
        hasGoogleIdentity: true,
        hasUserByEmail: true,
        googleEmailVerified: true,
      }),
    ).toBe("login");
  });

  it("creates a user when Google email is new", () => {
    expect(
      decideGoogleAuth({
        hasGoogleIdentity: false,
        hasUserByEmail: false,
        googleEmailVerified: true,
      }),
    ).toBe("create");
  });

  it("links Google onto an existing user when Google verified the email", () => {
    expect(
      decideGoogleAuth({
        hasGoogleIdentity: false,
        hasUserByEmail: true,
        googleEmailVerified: true,
      }),
    ).toBe("link_google");
  });

  it("rejects Google linking when the email is unverified", () => {
    expect(
      decideGoogleAuth({
        hasGoogleIdentity: false,
        hasUserByEmail: true,
        googleEmailVerified: false,
      }),
    ).toBe("unverified_collision");
  });
});

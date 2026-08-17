import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  changePasswordHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from "@/server/http/auth-handlers";
import {
  listSessionsHandler,
  meHandler,
  revokeOtherSessionsHandler,
} from "@/server/http/user-handlers";
import { authChallenges, CHALLENGE_TYPE, db } from "@/server/db";
import { generateOpaqueToken, hashToken } from "@/server/modules/auth";
import {
  claimChallengeToken,
  findPasswordIdentity,
  findUserByEmail,
  isDockerAvailable,
  resetTestDb,
  seedGoogleOnlyUser,
  startTestDb,
  stopTestDb,
} from "../helpers/db";

vi.mock("@/server/clients/google-oauth-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/clients/google-oauth-client")>();
  return {
    ...actual,
    getGoogleOAuthClient: () => ({
      generateAuthUrl: ({ state }: { state?: string }) =>
        `https://accounts.google.com/o/oauth2/v2/auth?state=${state ?? ""}`,
    }),
  };
});

const registerBody = { email: "ada@example.com", password: "password12", displayName: "Ada" };
const dockerAvailable = isDockerAvailable();

function request(path: string, init?: RequestInit, cookie?: string) {
  const headers = new Headers(init?.headers);
  headers.set("origin", "http://localhost:3000");
  if (init?.body) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init?.method,
    body: init?.body,
    headers,
  });
}

function body(value: unknown) {
  return JSON.stringify(value);
}

function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((entry) => entry.split(";", 1)[0])
    .join("; ");
}

function cookieValue(response: Response, name: string) {
  const entry = response.headers
    .getSetCookie()
    .find((candidate) => candidate.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1).split(";", 1)[0] : undefined;
}

async function registerAda() {
  const response = await registerHandler(
    request("/api/v1/auth/register", { method: "POST", body: body(registerBody) }),
  );
  return { response, jar: cookies(response) };
}

describe.skipIf(!dockerAvailable)("auth Route Handlers", () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(resetTestDb);

  it("registers, reads the current user, and logs out", async () => {
    const { response: registered, jar } = await registerAda();
    expect(registered.status).toBe(201);
    expect((await registered.json()).user.email).toBe(registerBody.email);

    const me = await meHandler(request("/api/v1/users/me", undefined, jar));
    expect(me.status).toBe(200);
    expect((await me.json()).user.displayName).toBe("Ada");

    const loggedOut = await logoutHandler(request("/api/v1/auth/logout", { method: "POST" }, jar));
    expect(loggedOut.status).toBe(204);
  });

  it("validates input and hides credential lookup details", async () => {
    const invalid = await loginHandler(request("/api/v1/auth/login", {
      method: "POST",
      body: body({ email: "missing@example.com", password: "nope" }),
    }));
    expect(invalid.status).toBe(401);
    expect((await invalid.json()).error.code).toBe("INVALID_CREDENTIALS");

    const malformed = await registerHandler(request("/api/v1/auth/register", {
      method: "POST",
      body: body({ email: "not-an-email", password: "short" }),
    }));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("rotates the refresh cookie and rejects reuse", async () => {
    const { jar: original } = await registerAda();
    const rotated = await refreshHandler(request("/api/v1/auth/refresh", { method: "POST" }, original));
    expect(rotated.status).toBe(200);
    expect(cookies(rotated)).not.toBe(original);

    const reused = await refreshHandler(request("/api/v1/auth/refresh", { method: "POST" }, original));
    expect(reused.status).toBe(401);
    expect((await reused.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a cross-origin mutation", async () => {
    const response = await loginHandler(new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { origin: "https://attacker.example", "content-type": "application/json" },
      body: body({ email: "a@example.com", password: "password12" }),
    }));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("INVALID_ORIGIN");
  });

  it("echoes CORS headers only for allowlisted origins", async () => {
    const { response } = await registerAda();
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");

    const rejected = await loginHandler(new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { origin: "https://attacker.example", "content-type": "application/json" },
      body: body(registerBody),
    }));
    expect(rejected.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("sets an access cookie whose lifetime matches the token lifetime", async () => {
    const { response } = await registerAda();
    const accessCookie = response.headers
      .getSetCookie()
      .find((entry) => entry.startsWith("access_token="));
    expect(accessCookie).toMatch(/Max-Age=900/i);
    expect(accessCookie).toMatch(/HttpOnly/i);
  });

  it("hands out no session when registering over a passwordless account", async () => {
    const victim = await seedGoogleOnlyUser("victim@example.com", "Victim");

    const response = await registerHandler(request("/api/v1/auth/register", {
      method: "POST",
      body: body({ email: "victim@example.com", password: "attacker-pass", displayName: "Attacker" }),
    }));

    expect(response.status).toBe(202);
    const payload = await response.json();
    expect(payload.user).toBeNull();
    expect(cookieValue(response, "access_token")).toBeUndefined();
    expect(cookieValue(response, "refresh_token")).toBeUndefined();
    expect(await findPasswordIdentity(victim.id)).toBeNull();

    const attempt = await loginHandler(request("/api/v1/auth/login", {
      method: "POST",
      body: body({ email: "victim@example.com", password: "attacker-pass" }),
    }));
    expect(attempt.status).toBe(401);
  });

  it("rejects a duplicate password registration", async () => {
    await registerAda();
    const again = await registerHandler(
      request("/api/v1/auth/register", { method: "POST", body: body(registerBody) }),
    );
    expect(again.status).toBe(409);
    expect((await again.json()).error.code).toBe("EMAIL_TAKEN");
  });

  it("verifies an email through the endpoint", async () => {
    await registerAda();
    const token = generateOpaqueToken();
    await claimChallengeToken(CHALLENGE_TYPE.emailVerification, hashToken(token));

    const verified = await verifyEmailHandler(
      request("/api/v1/auth/verify-email", { method: "POST", body: body({ token }) }),
    );
    expect(verified.status).toBe(200);
    expect((await verified.json()).user.emailVerifiedAt).not.toBeNull();

    const replayed = await verifyEmailHandler(
      request("/api/v1/auth/verify-email", { method: "POST", body: body({ token }) }),
    );
    expect(replayed.status).toBe(400);
    expect((await replayed.json()).error.code).toBe("INVALID_TOKEN");
  });

  it("resets a password, clears cookies, and invalidates old sessions", async () => {
    const { jar } = await registerAda();
    const ada = await findUserByEmail(registerBody.email);
    const token = generateOpaqueToken();
    await db.insert(authChallenges).values({
      userId: ada!.id,
      type: CHALLENGE_TYPE.passwordReset,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const reset = await resetPasswordHandler(request("/api/v1/auth/reset-password", {
      method: "POST",
      body: body({ token, password: "brand-new-pass" }),
    }));
    expect(reset.status).toBe(200);
    expect(cookieValue(reset, "refresh_token")).toBe("");

    const stale = await refreshHandler(request("/api/v1/auth/refresh", { method: "POST" }, jar));
    expect(stale.status).toBe(401);

    const signedIn = await loginHandler(request("/api/v1/auth/login", {
      method: "POST",
      body: body({ email: registerBody.email, password: "brand-new-pass" }),
    }));
    expect(signedIn.status).toBe(200);
  });

  it("changes a password, keeps this device, and drops the others", async () => {
    const { jar } = await registerAda();
    const second = await loginHandler(request("/api/v1/auth/login", {
      method: "POST",
      body: body({ email: registerBody.email, password: registerBody.password }),
    }));
    const secondJar = cookies(second);

    const changed = await changePasswordHandler(request(
      "/api/v1/auth/change-password",
      { method: "POST", body: body({ currentPassword: "password12", newPassword: "password-thirteen" }) },
      jar,
    ));
    expect(changed.status).toBe(200);
    const rotatedJar = cookies(changed);

    const stillMe = await meHandler(request("/api/v1/users/me", undefined, rotatedJar));
    expect(stillMe.status).toBe(200);

    const otherDevice = await refreshHandler(
      request("/api/v1/auth/refresh", { method: "POST" }, secondJar),
    );
    expect(otherDevice.status).toBe(401);
  });

  it("refuses change-password without authentication", async () => {
    const response = await changePasswordHandler(request("/api/v1/auth/change-password", {
      method: "POST",
      body: body({ currentPassword: "password12", newPassword: "password34" }),
    }));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("lists devices and signs out the others", async () => {
    const { jar } = await registerAda();
    await loginHandler(request("/api/v1/auth/login", {
      method: "POST",
      body: body({ email: registerBody.email, password: registerBody.password }),
    }));

    const listed = await listSessionsHandler(
      request("/api/v1/users/me/sessions", undefined, jar),
    );
    expect(listed.status).toBe(200);
    const { sessions } = await listed.json();
    expect(sessions).toHaveLength(2);
    expect(sessions.filter((session: { current: boolean }) => session.current)).toHaveLength(1);

    const revoked = await revokeOtherSessionsHandler(
      request("/api/v1/users/me/sessions", { method: "DELETE" }, jar),
    );
    expect(revoked.status).toBe(200);
    expect((await revoked.json()).revoked).toBe(1);

    const after = await listSessionsHandler(request("/api/v1/users/me/sessions", undefined, jar));
    expect((await after.json()).sessions).toHaveLength(1);
  });

  it("refuses to list devices without authentication", async () => {
    const response = await listSessionsHandler(request("/api/v1/users/me/sessions"));
    expect(response.status).toBe(401);
  });
});

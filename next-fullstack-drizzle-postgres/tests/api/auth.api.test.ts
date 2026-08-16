import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
} from "@/server/http/auth-handlers";
import { meHandler } from "@/server/http/user-handlers";
import { isDockerAvailable, resetTestDb, startTestDb, stopTestDb } from "../helpers/db";

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

describe.skipIf(!dockerAvailable)("auth Route Handlers", () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(resetTestDb);

  it("registers, reads the current user, and logs out", async () => {
    const registered = await registerHandler(request("/api/v1/auth/register", { method: "POST", body: body(registerBody) }));
    expect(registered.status).toBe(201);
    const jar = cookies(registered);
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
    const registered = await registerHandler(request("/api/v1/auth/register", { method: "POST", body: body(registerBody) }));
    const original = cookies(registered);
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
});

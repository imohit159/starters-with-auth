import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { COOKIE } from "../../src/config/constants";
import { createApp } from "../../src/app";
import { hashToken } from "../../src/utils/crypto";
import {
  findPasswordResetChallenge,
  isDockerAvailable,
  resetTestDb,
  setChallengeTokenHash,
  startTestDb,
  stopTestDb,
} from "../helpers/db";

vi.mock("../../src/utils/google-oauth-client", () => ({
  getGoogleOAuthClient: () => ({
    generateAuthUrl: ({ state }: { state?: string }) =>
      `https://accounts.google.com/o/oauth2/v2/auth?state=${state ?? ""}`,
    getToken: async () => ({ tokens: { id_token: "mock-id-token" } }),
    verifyIdToken: async () => ({
      getPayload: () => ({
        sub: "google-sub-1",
        email: "google.user@example.com",
        email_verified: true,
        name: "Google User",
        picture: "https://example.com/avatar.png",
      }),
    }),
  }),
}));

function cookieValue(response: request.Response, name: string) {
  const header = response.headers["set-cookie"];
  const list = Array.isArray(header) ? header : header ? [header] : [];
  const match = list.find((entry) => entry.startsWith(`${name}=`));
  return match?.split(";")[0]?.split("=")[1];
}

const registerBody = {
  email: "ada@example.com",
  password: "password12",
  displayName: "Ada",
};

describe.skipIf(!isDockerAvailable())("auth API", () => {
  const app = createApp();

  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  it("registers, reads me, and logs out", async () => {
    const agent = request.agent(app);
    const registered = await agent.post("/api/v1/auth/register").send(registerBody);
    expect(registered.status).toBe(201);
    expect(registered.body.user.email).toBe("ada@example.com");

    const me = await agent.get("/api/v1/users/me");
    expect(me.status).toBe(200);
    expect(me.body.user.displayName).toBe("Ada");

    const loggedOut = await agent.post("/api/v1/auth/logout");
    expect(loggedOut.status).toBe(204);

    const afterLogout = await agent.get("/api/v1/users/me");
    expect(afterLogout.status).toBe(401);
  });

  it("logs in with email and password", async () => {
    const agent = request.agent(app);
    await agent.post("/api/v1/auth/register").send(registerBody);
    await agent.post("/api/v1/auth/logout");

    const login = await agent.post("/api/v1/auth/login").send({
      email: "ada@example.com",
      password: "password12",
    });
    expect(login.status).toBe(200);
    const me = await agent.get("/api/v1/users/me");
    expect(me.status).toBe(200);
  });

  it("rejects invalid credentials and validation errors", async () => {
    const invalid = await request(app).post("/api/v1/auth/login").send({
      email: "missing@example.com",
      password: "nope",
    });
    expect(invalid.status).toBe(401);

    const validation = await request(app).post("/api/v1/auth/register").send({
      email: "not-an-email",
      password: "short",
    });
    expect(validation.status).toBe(400);
  });

  it("returns 401 for unauthenticated /users/me", async () => {
    const me = await request(app).get("/api/v1/users/me");
    expect(me.status).toBe(401);
  });

  it("rotates refresh tokens and kills the family on reuse", async () => {
    const registered = await request(app).post("/api/v1/auth/register").send(registerBody);
    const oldRefresh = cookieValue(registered, COOKIE.refresh);
    expect(oldRefresh).toBeTruthy();

    const rotated = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `${COOKIE.refresh}=${oldRefresh}`);
    expect(rotated.status).toBe(200);
    expect(cookieValue(rotated, COOKIE.refresh)).not.toBe(oldRefresh);

    const reused = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `${COOKIE.refresh}=${oldRefresh}`);
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe("UNAUTHORIZED");
  });

  it("creates a Google user from a mocked callback and sets cookies", async () => {
    const start = await request(app).get("/api/v1/auth/google").redirects(0);
    expect(start.status).toBe(302);
    const location = String(start.headers.location);
    const state = new URL(location).searchParams.get("state");
    expect(state).toBeTruthy();

    const callback = await request(app)
      .get("/api/v1/auth/google/callback")
      .query({ code: "google-code", state })
      .redirects(0);

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe("http://localhost:3000/auth/callback");
    expect(cookieValue(callback, COOKIE.access)).toBeTruthy();
    expect(cookieValue(callback, COOKIE.refresh)).toBeTruthy();

    const me = await request(app)
      .get("/api/v1/users/me")
      .set("Cookie", `${COOKIE.access}=${cookieValue(callback, COOKIE.access)}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("google.user@example.com");
  });

  it("consumes a password reset token only once", async () => {
    const agent = request.agent(app);
    await agent.post("/api/v1/auth/register").send(registerBody);

    await agent.post("/api/v1/auth/forgot-password").send({ email: "ada@example.com" });
    const challenge = await findPasswordResetChallenge();
    expect(challenge).toBeTruthy();

    const token = "reset-token-value";
    await setChallengeTokenHash(challenge!.id, hashToken(token));

    const first = await request(app).post("/api/v1/auth/reset-password").send({
      token,
      password: "newpassword12",
    });
    expect(first.status).toBe(200);

    const second = await request(app).post("/api/v1/auth/reset-password").send({
      token,
      password: "anotherpass12",
    });
    expect(second.status).toBe(400);
  });
});

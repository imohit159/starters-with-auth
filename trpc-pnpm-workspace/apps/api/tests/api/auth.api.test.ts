import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { AuthChallenge } from "@repo/database";
import { hashToken } from "@repo/auth";
import { COOKIE } from "@repo/trpc";
import { createApp } from "../../src/app";
import { resetTestDb, startTestDb, stopTestDb } from "../helpers/db";

vi.mock("../../../../packages/services/auth/src/google-oauth-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../../packages/services/auth/src/google-oauth-client")>();
  return {
    ...actual,
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
  };
});

function cookieValue(response: request.Response, name: string) {
  const header = response.headers["set-cookie"];
  const list = Array.isArray(header) ? header : header ? [header] : [];
  const match = list.find((entry) => entry.startsWith(`${name}=`));
  return match?.split(";")[0]?.split("=")[1];
}

function trpcData(response: request.Response) {
  return response.body?.result?.data;
}

function trpcError(response: request.Response) {
  return response.body?.error?.json ?? response.body?.error;
}

function trpcMutate(
  agent: ReturnType<typeof request.agent> | ReturnType<typeof request>,
  procedure: string,
  input: object = {},
) {
  return agent.post(`/trpc/${procedure}`).set("content-type", "application/json").send(input);
}

function trpcQuery(
  agent: ReturnType<typeof request.agent> | ReturnType<typeof request>,
  procedure: string,
) {
  return agent.get(`/trpc/${procedure}`);
}

const registerBody = {
  email: "ada@example.com",
  password: "password12",
  displayName: "Ada",
};

describe("auth tRPC API", () => {
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
    const registered = await trpcMutate(agent, "auth.register", registerBody);
    expect(registered.status).toBe(200);
    expect(trpcData(registered).user.email).toBe("ada@example.com");

    const me = await trpcQuery(agent, "users.me");
    expect(me.status).toBe(200);
    expect(trpcData(me).displayName).toBe("Ada");

    const loggedOut = await trpcMutate(agent, "auth.logout");
    expect(loggedOut.status).toBe(200);

    const afterLogout = await trpcQuery(agent, "users.me");
    expect(afterLogout.status).toBe(401);
  });

  it("logs in with email and password", async () => {
    const agent = request.agent(app);
    await trpcMutate(agent, "auth.register", registerBody);
    await trpcMutate(agent, "auth.logout");

    const login = await trpcMutate(agent, "auth.login", {
      email: "ada@example.com",
      password: "password12",
    });
    expect(login.status).toBe(200);
    const me = await trpcQuery(agent, "users.me");
    expect(me.status).toBe(200);
  });

  it("rejects invalid credentials and validation errors", async () => {
    const invalid = await trpcMutate(request(app), "auth.login", {
      email: "missing@example.com",
      password: "nope",
    });
    expect(invalid.status).toBe(401);

    const validation = await trpcMutate(request(app), "auth.register", {
      email: "not-an-email",
      password: "short",
    });
    expect(validation.status).toBe(400);
  });

  it("returns 401 for unauthenticated users.me", async () => {
    const me = await trpcQuery(request(app), "users.me");
    expect(me.status).toBe(401);
  });

  it("rotates refresh tokens and kills the family on reuse", async () => {
    const registered = await trpcMutate(request(app), "auth.register", registerBody);
    const oldRefresh = cookieValue(registered, COOKIE.refresh);
    expect(oldRefresh).toBeTruthy();

    const rotated = await request(app)
      .post("/trpc/auth.refresh")
      .set("Cookie", `${COOKIE.refresh}=${oldRefresh}`)
      .set("content-type", "application/json")
      .send({});
    expect(rotated.status).toBe(200);
    expect(cookieValue(rotated, COOKIE.refresh)).not.toBe(oldRefresh);

    const reused = await request(app)
      .post("/trpc/auth.refresh")
      .set("Cookie", `${COOKIE.refresh}=${oldRefresh}`)
      .set("content-type", "application/json")
      .send({});
    expect(reused.status).toBe(401);
    expect(trpcError(reused).data.appCode ?? trpcError(reused).data.code).toBe("UNAUTHORIZED");
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
      .get("/trpc/users.me")
      .set("Cookie", `${COOKIE.access}=${cookieValue(callback, COOKIE.access)}`);
    expect(me.status).toBe(200);
    expect(trpcData(me).email).toBe("google.user@example.com");
  });

  it("consumes a password reset token only once", async () => {
    const agent = request.agent(app);
    await trpcMutate(agent, "auth.register", registerBody);

    await trpcMutate(agent, "auth.forgotPassword", { email: "ada@example.com" });
    const challenge = await AuthChallenge.findOne({ type: "password_reset" });
    expect(challenge).toBeTruthy();

    const token = "reset-token-value";
    challenge!.tokenHash = hashToken(token);
    await challenge!.save();

    const first = await trpcMutate(request(app), "auth.resetPassword", {
      token,
      password: "newpassword12",
    });
    expect(first.status).toBe(200);

    const second = await trpcMutate(request(app), "auth.resetPassword", {
      token,
      password: "anotherpass12",
    });
    expect(second.status).toBe(400);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { generateStripeTestWebhookHeader } from "@repo/services";
import { db, organizations, PLATFORM_ROLE, users } from "@repo/database";
import { createApp } from "../../src/app";
import { isDockerAvailable, resetTestDb, startTestDb, stopTestDb } from "../helpers/db";

vi.mock("../../../../packages/services/src/clients/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../packages/services/src/clients/stripe")>();
  return {
    ...actual,
    createStripeCheckoutSession: async ({ organizationId }: { organizationId: string }) => ({
      id: "cs_test_1",
      url: `https://checkout.stripe.com/c/pay/cs_test?org=${organizationId}`,
    }),
    createStripePortalSession: async () => ({
      url: "https://billing.stripe.com/session/test",
    }),
  };
});

const ada = { email: "ada@example.com", password: "password12", displayName: "Ada" };
const gus = { email: "gus@example.com", password: "password12", displayName: "Gus" };
const dockerAvailable = isDockerAvailable();

describe.skipIf(!dockerAvailable)("org, billing, and todo REST API", () => {
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

  it("creates an org, scopes todos by membership, and gates create on subscription", async () => {
    const owner = request.agent(app);
    await owner.post("/api/v1/auth/register").send(ada);
    const created = await owner.post("/api/v1/orgs").send({ name: "Ada Labs" });
    expect(created.status).toBe(201);
    const orgId = created.body.organization.id;
    expect(created.body.organization.role).toBe("owner");

    const outsider = request.agent(app);
    await outsider.post("/api/v1/auth/register").send(gus);
    const forbidden = await outsider.get(`/api/v1/orgs/${orgId}`);
    expect(forbidden.status).toBe(403);

    const blocked = await owner.post(`/api/v1/orgs/${orgId}/todos`).send({ title: "Ship it" });
    expect(blocked.status).toBe(402);
    expect(blocked.body.error.code).toBe("SUBSCRIPTION_REQUIRED");

    await db
      .update(organizations)
      .set({ subscriptionStatus: "active", subscriptionEndsAt: new Date(Date.now() + 86_400_000) })
      .where(eq(organizations.id, orgId));

    const todo = await owner.post(`/api/v1/orgs/${orgId}/todos`).send({ title: "Ship it" });
    expect(todo.status).toBe(201);
    expect(todo.body.todo.title).toBe("Ship it");

    const outsiderTodos = await outsider.get(`/api/v1/orgs/${orgId}/todos`);
    expect(outsiderTodos.status).toBe(403);
  });

  it("invites a member who can accept with the matching email", async () => {
    const owner = request.agent(app);
    await owner.post("/api/v1/auth/register").send(ada);
    const created = await owner.post("/api/v1/orgs").send({ name: "Ada Labs" });
    const orgId = created.body.organization.id;

    const invite = await owner.post(`/api/v1/orgs/${orgId}/invites`).send({
      email: "gus@example.com",
      role: "member",
    });
    expect(invite.status).toBe(201);

    const tokenMatch = /token=([^&\s]+)/.exec(JSON.stringify(invite.body));
    expect(tokenMatch).toBeNull();

    const { hashToken } = await import("@repo/services");
    const { organizationInvites } = await import("@repo/database");
    const [row] = await db.select().from(organizationInvites);
    const token = "invite-token-value";
    await db.update(organizationInvites).set({ tokenHash: hashToken(token) }).where(eq(organizationInvites.id, row.id));

    const member = request.agent(app);
    await member.post("/api/v1/auth/register").send(gus);
    const accepted = await member.post("/api/v1/orgs/invites/accept").send({ token });
    expect(accepted.status).toBe(200);
    expect(accepted.body.organization.id).toBe(orgId);
    expect(accepted.body.organization.role).toBe("member");
  });

  it("rejects a forged Stripe webhook and applies a signed one idempotently", async () => {
    const owner = request.agent(app);
    await owner.post("/api/v1/auth/register").send(ada);
    const created = await owner.post("/api/v1/orgs").send({ name: "Ada Labs" });
    const orgId = created.body.organization.id;

    const forged = await request(app)
      .post("/api/v1/billing/webhook")
      .set("content-type", "application/json")
      .set("stripe-signature", "t=1,v1=deadbeef")
      .send({ id: "evt_forged" });
    expect(forged.status).toBe(400);

    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const payload = JSON.stringify({
      id: "evt_test_checkout_1",
      object: "event",
      api_version: "2025-01-27.acacia",
      created: Math.floor(Date.now() / 1000),
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_1",
          object: "subscription",
          status: "active",
          customer: "cus_test_1",
          metadata: { organizationId: orgId },
          items: {
            object: "list",
            data: [
              {
                id: "si_1",
                object: "subscription_item",
                current_period_end: periodEnd,
                price: { id: "price_test" },
              },
            ],
          },
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
    });
    const signature = generateStripeTestWebhookHeader(payload, "whsec_test_secret");

    const first = await request(app)
      .post("/api/v1/billing/webhook")
      .set("content-type", "application/json")
      .set("stripe-signature", signature)
      .send(payload);
    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBe(false);

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    expect(org.subscriptionStatus).toBe("active");
    expect(org.stripeCustomerId).toBe("cus_test_1");
    expect(org.stripeSubscriptionId).toBe("sub_test_1");

    const second = await request(app)
      .post("/api/v1/billing/webhook")
      .set("content-type", "application/json")
      .set("stripe-signature", signature)
      .send(payload);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
  });

  it("lets a platform admin grant complimentary access", async () => {
    const owner = request.agent(app);
    await owner.post("/api/v1/auth/register").send(ada);
    const created = await owner.post("/api/v1/orgs").send({ name: "Ada Labs" });
    const orgId = created.body.organization.id;

    const denied = await owner.get("/api/v1/admin/users").query({ email: "ada" });
    expect(denied.status).toBe(403);

    const [adaUser] = await db.select().from(users).where(eq(users.email, "ada@example.com"));
    await db.update(users).set({ roles: [PLATFORM_ROLE.user, PLATFORM_ROLE.admin] }).where(eq(users.id, adaUser.id));

    const granted = await owner.post(`/api/v1/admin/orgs/${orgId}/grant`).send({ days: 30 });
    expect(granted.status).toBe(200);
    expect(granted.body.subscription.isSubscribed).toBe(true);

    const todo = await owner.post(`/api/v1/orgs/${orgId}/todos`).send({ title: "Admin grant" });
    expect(todo.status).toBe(201);
  });

  it("starts checkout for an org owner", async () => {
    const owner = request.agent(app);
    await owner.post("/api/v1/auth/register").send(ada);
    const created = await owner.post("/api/v1/orgs").send({ name: "Ada Labs" });
    const orgId = created.body.organization.id;

    const checkout = await owner.post(`/api/v1/orgs/${orgId}/billing/checkout`);
    expect(checkout.status).toBe(200);
    expect(checkout.body.url).toContain("checkout.stripe.com");
  });
});

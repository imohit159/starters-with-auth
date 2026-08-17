import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { generateStripeTestWebhookHeader } from "@repo/services";
import { Organization, OrganizationInvite, PLATFORM_ROLE, User } from "@repo/database";
import { createApp } from "../../src/app";
import { resetTestDb, startTestDb, stopTestDb } from "../helpers/db";

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
  input?: object,
) {
  const encoded = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : "";
  return agent.get(`/trpc/${procedure}${encoded}`);
}

const ada = { email: "ada@example.com", password: "password12", displayName: "Ada" };
const gus = { email: "gus@example.com", password: "password12", displayName: "Gus" };

describe("org, billing, and todo tRPC API", () => {
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
    await trpcMutate(owner, "auth.register", ada);
    const created = await trpcMutate(owner, "orgs.create", { name: "Ada Labs" });
    expect(created.status).toBe(200);
    const orgId = trpcData(created).id;
    expect(trpcData(created).role).toBe("owner");

    const outsider = request.agent(app);
    await trpcMutate(outsider, "auth.register", gus);
    const forbidden = await trpcQuery(outsider, "orgs.get", { organizationId: orgId });
    expect(forbidden.status).toBe(403);

    const blocked = await trpcMutate(owner, "todos.create", { organizationId: orgId, title: "Ship it" });
    expect(blocked.status).toBe(403);
    expect(trpcError(blocked).data.appCode).toBe("SUBSCRIPTION_REQUIRED");

    await Organization.findByIdAndUpdate(orgId, {
      $set: { subscriptionStatus: "active", subscriptionEndsAt: new Date(Date.now() + 86_400_000) },
    });

    const todo = await trpcMutate(owner, "todos.create", { organizationId: orgId, title: "Ship it" });
    expect(todo.status).toBe(200);
    expect(trpcData(todo).title).toBe("Ship it");

    const outsiderTodos = await trpcQuery(outsider, "todos.list", { organizationId: orgId });
    expect(outsiderTodos.status).toBe(403);
  });

  it("invites a member who can accept with the matching email", async () => {
    const owner = request.agent(app);
    await trpcMutate(owner, "auth.register", ada);
    const created = await trpcMutate(owner, "orgs.create", { name: "Ada Labs" });
    const orgId = trpcData(created).id;

    const invite = await trpcMutate(owner, "orgs.invite", {
      organizationId: orgId,
      email: "gus@example.com",
      role: "member",
    });
    expect(invite.status).toBe(200);

    const tokenMatch = /token=([^&\s]+)/.exec(JSON.stringify(invite.body));
    expect(tokenMatch).toBeNull();

    const { hashToken } = await import("@repo/services");
    const row = await OrganizationInvite.findOne({});
    const token = "invite-token-value";
    row!.tokenHash = hashToken(token);
    await row!.save();

    const member = request.agent(app);
    await trpcMutate(member, "auth.register", gus);
    const accepted = await trpcMutate(member, "orgs.acceptInvite", { token });
    expect(accepted.status).toBe(200);
    expect(trpcData(accepted).id).toBe(orgId);
    expect(trpcData(accepted).role).toBe("member");
  });

  it("rejects a forged Stripe webhook and applies a signed one idempotently", async () => {
    const owner = request.agent(app);
    await trpcMutate(owner, "auth.register", ada);
    const created = await trpcMutate(owner, "orgs.create", { name: "Ada Labs" });
    const orgId = trpcData(created).id;

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

    const org = await Organization.findById(orgId);
    expect(org?.subscriptionStatus).toBe("active");
    expect(org?.stripeCustomerId).toBe("cus_test_1");
    expect(org?.stripeSubscriptionId).toBe("sub_test_1");

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
    await trpcMutate(owner, "auth.register", ada);
    const created = await trpcMutate(owner, "orgs.create", { name: "Ada Labs" });
    const orgId = trpcData(created).id;

    const denied = await trpcQuery(owner, "admin.searchUsers", { email: "ada" });
    expect(denied.status).toBe(403);

    await User.updateOne(
      { email: "ada@example.com" },
      { $set: { roles: [PLATFORM_ROLE.user, PLATFORM_ROLE.admin] } },
    );

    const granted = await trpcMutate(owner, "admin.grantAccess", { organizationId: orgId, days: 30 });
    expect(granted.status).toBe(200);
    expect(trpcData(granted).isSubscribed).toBe(true);

    const todo = await trpcMutate(owner, "todos.create", { organizationId: orgId, title: "Admin grant" });
    expect(todo.status).toBe(200);
  });

  it("starts checkout for an org owner", async () => {
    const owner = request.agent(app);
    await trpcMutate(owner, "auth.register", ada);
    const created = await trpcMutate(owner, "orgs.create", { name: "Ada Labs" });
    const orgId = trpcData(created).id;

    const checkout = await trpcMutate(owner, "billing.createCheckoutSession", { organizationId: orgId });
    expect(checkout.status).toBe(200);
    expect(trpcData(checkout).url).toContain("checkout.stripe.com");
  });
});

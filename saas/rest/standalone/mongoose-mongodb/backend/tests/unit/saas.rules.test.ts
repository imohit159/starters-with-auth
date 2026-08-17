import { describe, expect, it } from "vitest";
import { ORG_ROLE, SUBSCRIPTION_STATUS } from "../../src/database";
import { canManageOrg, isSubscriptionActive } from "../../src/modules/orgs/orgs.service";

describe("org and billing rules", () => {
  it("lets owners and admins manage the org", () => {
    expect(canManageOrg(ORG_ROLE.owner)).toBe(true);
    expect(canManageOrg(ORG_ROLE.admin)).toBe(true);
    expect(canManageOrg(ORG_ROLE.member)).toBe(false);
  });

  it("treats active and trialing subscriptions as entitled until period end", () => {
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    expect(isSubscriptionActive(SUBSCRIPTION_STATUS.active, future)).toBe(true);
    expect(isSubscriptionActive(SUBSCRIPTION_STATUS.trialing, null)).toBe(true);
    expect(isSubscriptionActive(SUBSCRIPTION_STATUS.active, past)).toBe(false);
    expect(isSubscriptionActive(SUBSCRIPTION_STATUS.canceled, future)).toBe(false);
    expect(isSubscriptionActive(SUBSCRIPTION_STATUS.none, null)).toBe(false);
  });
});

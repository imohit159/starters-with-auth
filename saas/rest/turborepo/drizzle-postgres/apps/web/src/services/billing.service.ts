import { API_PATHS } from "@/constants/api";
import { api } from "@/lib/api";
import type { Subscription } from "@/types/auth";

export async function getSubscription(organizationId: string) {
  const { data } = await api.get<{ subscription: Subscription }>(API_PATHS.orgBilling(organizationId));
  return data.subscription;
}

export async function createCheckoutSession(organizationId: string) {
  const { data } = await api.post<{ url: string }>(API_PATHS.orgCheckout(organizationId));
  return data;
}

export async function createPortalSession(organizationId: string) {
  const { data } = await api.post<{ url: string }>(API_PATHS.orgPortal(organizationId));
  return data;
}

import { API_PATHS } from "@/constants/api";
import { api } from "@/lib/api";
import type { Subscription } from "@/types/auth";

export async function getSubscription(organizationId: string) {
  const { data } = await api.get<Subscription>(`${API_PATHS.orgs}/${organizationId}/billing`);
  return data;
}

export async function createCheckoutSession(organizationId: string) {
  const { data } = await api.post<{ url: string }>(`${API_PATHS.orgs}/${organizationId}/billing/checkout`);
  return data;
}

export async function createPortalSession(organizationId: string) {
  const { data } = await api.post<{ url: string }>(`${API_PATHS.orgs}/${organizationId}/billing/portal`);
  return data;
}

import { API_PATHS } from "@/constants/api";
import { api } from "@/lib/api";
import type { AdminUserOrg, Subscription, User } from "@/types/auth";

export async function searchUsers(email: string) {
  const { data } = await api.get<{ users: User[] }>(API_PATHS.adminUsers, { params: { email } });
  return data;
}

export async function getAdminUser(userId: string) {
  const { data } = await api.get<{ user: User; organizations: AdminUserOrg[] }>(API_PATHS.adminUser(userId));
  return data;
}

export async function grantAccess(input: { organizationId: string; days: number }) {
  const { data } = await api.post<{ subscription: Subscription }>(API_PATHS.adminGrant(input.organizationId), {
    days: input.days,
  });
  return data.subscription;
}

export async function revokeAccess(input: { organizationId: string }) {
  const { data } = await api.post<{ subscription: Subscription }>(API_PATHS.adminRevoke(input.organizationId));
  return data.subscription;
}

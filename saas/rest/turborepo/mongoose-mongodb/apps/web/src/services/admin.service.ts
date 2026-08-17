import { api } from "@/lib/api";
import type { AdminUserOrg, Subscription, User } from "@/types/auth";

export async function searchUsers(email: string) {
  const { data } = await api.get<{ users: User[] }>("/admin/users", { params: { email } });
  return data;
}

export async function getAdminUser(userId: string) {
  const { data } = await api.get<{ user: User; organizations: AdminUserOrg[] }>(`/admin/users/${userId}`);
  return data;
}

export async function grantAccess(input: { organizationId: string; days: number }) {
  const { data } = await api.post<Subscription>(`/admin/organizations/${input.organizationId}/access`, {
    days: input.days,
  });
  return data;
}

export async function revokeAccess(input: { organizationId: string }) {
  const { data } = await api.delete<Subscription>(`/admin/organizations/${input.organizationId}/access`);
  return data;
}

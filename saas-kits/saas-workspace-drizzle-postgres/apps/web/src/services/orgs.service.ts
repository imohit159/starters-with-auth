import { API_PATHS } from "@/constants/api";
import { api } from "@/lib/api";
import type { Invite, Member, Organization } from "@/types/auth";

export async function listOrganizations() {
  const { data } = await api.get<{ organizations: Organization[] }>(API_PATHS.orgs);
  return data.organizations;
}

export async function getOrganization(organizationId: string) {
  const { data } = await api.get<{ organization: Organization }>(API_PATHS.org(organizationId));
  return data.organization;
}

export async function createOrganization(name: string) {
  const { data } = await api.post<{ organization: Organization }>(API_PATHS.orgs, { name });
  return data.organization;
}

export async function listMembers(organizationId: string) {
  const { data } = await api.get<{ members: Member[]; invites: Invite[] }>(API_PATHS.orgMembers(organizationId));
  return data;
}

export async function inviteMember(input: { organizationId: string; email: string; role: "admin" | "member" }) {
  const { data } = await api.post<{ invite: Invite; message: string }>(
    API_PATHS.orgInvites(input.organizationId),
    { email: input.email, role: input.role },
  );
  return data;
}

export async function acceptInvite(token: string) {
  const { data } = await api.post<{ organization: Organization }>(API_PATHS.acceptInvite, { token });
  return data.organization;
}

export async function revokeInvite(input: { organizationId: string; inviteId: string }) {
  const { data } = await api.delete<{ message: string }>(
    API_PATHS.orgInvite(input.organizationId, input.inviteId),
  );
  return data;
}

export async function updateMemberRole(input: {
  organizationId: string;
  userId: string;
  role: "owner" | "admin" | "member";
}) {
  const { data } = await api.patch<{ userId: string; role: string }>(
    API_PATHS.orgMember(input.organizationId, input.userId),
    { role: input.role },
  );
  return data;
}

export async function removeMember(input: { organizationId: string; userId: string }) {
  const { data } = await api.delete<{ message: string }>(API_PATHS.orgMember(input.organizationId, input.userId));
  return data;
}

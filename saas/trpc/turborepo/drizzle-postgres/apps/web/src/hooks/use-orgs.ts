"use client";

import { trpc } from "@/lib/trpc";

export function useOrganizations() {
  return trpc.orgs.list.useQuery();
}

export function useOrganization(organizationId: string | null) {
  return trpc.orgs.get.useQuery(
    { organizationId: organizationId ?? "" },
    { enabled: Boolean(organizationId) },
  );
}

export function useMembers(organizationId: string | null) {
  return trpc.orgs.members.useQuery(
    { organizationId: organizationId ?? "" },
    { enabled: Boolean(organizationId) },
  );
}

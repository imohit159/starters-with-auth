"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/api";
import { getOrganization, listMembers, listOrganizations } from "@/services/orgs.service";

export function useOrganizations() {
  return useQuery({
    queryKey: QUERY_KEYS.orgs,
    queryFn: listOrganizations,
  });
}

export function useOrganization(organizationId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.org(organizationId ?? ""),
    queryFn: () => getOrganization(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useMembers(organizationId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.members(organizationId ?? ""),
    queryFn: () => listMembers(organizationId!),
    enabled: Boolean(organizationId),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { getAdminUser, grantAccess, revokeAccess, searchUsers } from "@/services/admin.service";

export function useAdminSearch(email: string) {
  return useQuery({
    queryKey: QUERY_KEYS.adminUsers(email),
    queryFn: () => searchUsers(email),
    enabled: email.trim().length > 1,
  });
}

export function useAdminUser(userId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.adminUser(userId ?? ""),
    queryFn: () => getAdminUser(userId ?? ""),
    enabled: Boolean(userId),
  });
}

export function useGrantAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: grantAccess,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Access granted");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to grant access"));
    },
  });
}

export function useRevokeAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeAccess,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Access revoked");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to revoke access"));
    },
  });
}

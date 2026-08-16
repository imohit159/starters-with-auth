"use client";

import { toast } from "sonner";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useAdminSearch(email: string) {
  return trpc.admin.searchUsers.useQuery({ email }, { enabled: email.trim().length > 1 });
}

export function useAdminUser(userId: string | null) {
  return trpc.admin.getUser.useQuery({ userId: userId ?? "" }, { enabled: Boolean(userId) });
}

export function useGrantAccess() {
  const utils = trpc.useUtils();
  return trpc.admin.grantAccess.useMutation({
    onSuccess: async () => {
      await utils.admin.getUser.invalidate();
      toast.success("Access granted");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to grant access"));
    },
  });
}

export function useRevokeAccess() {
  const utils = trpc.useUtils();
  return trpc.admin.revokeAccess.useMutation({
    onSuccess: async () => {
      await utils.admin.getUser.invalidate();
      toast.success("Access revoked");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to revoke access"));
    },
  });
}

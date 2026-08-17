"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { revokeOtherSessions } from "@/services/auth.service";

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: async (revoked) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessions });
      toast.success(
        revoked === 0
          ? "No other devices were signed in"
          : `Signed out ${revoked} other ${revoked === 1 ? "device" : "devices"}`,
      );
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to sign out other devices"));
    },
  });
}

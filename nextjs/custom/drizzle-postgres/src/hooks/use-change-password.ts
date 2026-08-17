"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { changePassword } from "@/services/auth.service";
import type { ChangePasswordValues } from "@/schemas/auth";

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ChangePasswordValues) => changePassword(values),
    onSuccess: async (data) => {
      queryClient.setQueryData(QUERY_KEYS.me, data.user);
      // Other devices were revoked; the session list is stale.
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessions });
      toast.success("Password updated. Other devices were signed out.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to change password"));
    },
  });
}

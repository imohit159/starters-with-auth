"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QUERY_KEYS, ROUTES } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { logout } from "@/services/auth.service";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.me });
      toast.success("Signed out");
      router.push(ROUTES.login);
      router.refresh();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to sign out"));
    },
  });
}

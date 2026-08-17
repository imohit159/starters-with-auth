"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QUERY_KEYS, ROUTES } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { login } from "@/services/auth.service";
import type { LoginValues } from "@/schemas/auth";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LoginValues) => login(values),
    onSuccess: async (data) => {
      queryClient.setQueryData(QUERY_KEYS.me, data.user);
      toast.success("Signed in");
      router.push(ROUTES.dashboard);
      router.refresh();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to sign in"));
    },
  });
}

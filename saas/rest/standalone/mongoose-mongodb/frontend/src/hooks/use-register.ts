"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QUERY_KEYS, ROUTES } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { register } from "@/services/auth.service";
import type { RegisterValues } from "@/schemas/auth";

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: RegisterValues) => register(values),
    onSuccess: async (data) => {
      if (data.message) {
        toast.success(data.message);
        router.push(ROUTES.login);
        return;
      }
      queryClient.setQueryData(QUERY_KEYS.me, data.user);
      toast.success("Account created");
      router.push(ROUTES.dashboard);
      router.refresh();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to create account"));
    },
  });
}

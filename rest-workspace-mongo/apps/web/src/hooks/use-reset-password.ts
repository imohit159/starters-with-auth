"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { resetPassword } from "@/services/auth.service";

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      resetPassword(token, password),
    onSuccess: (data) => {
      toast.success(data.message);
      router.push(ROUTES.login);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to reset password"));
    },
  });
}

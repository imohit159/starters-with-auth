"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants/api";
import { getApiErrorMessage } from "@/lib/api";
import { verifyEmail } from "@/services/auth.service";

export function useVerifyEmail() {
  const router = useRouter();

  return useMutation({
    mutationFn: (token: string) => verifyEmail(token),
    onSuccess: () => {
      toast.success("Email verified. You can sign in.");
      router.push(ROUTES.login);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to verify email"));
    },
  });
}

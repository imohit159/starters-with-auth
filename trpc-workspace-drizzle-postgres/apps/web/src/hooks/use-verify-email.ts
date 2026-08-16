"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants/api";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useVerifyEmail() {
  const router = useRouter();

  return trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      toast.success("Email verified. You can sign in.");
      router.push(ROUTES.login);
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to verify email"));
    },
  });
}

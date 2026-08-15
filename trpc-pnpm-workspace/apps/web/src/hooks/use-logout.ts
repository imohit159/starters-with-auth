"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants/api";
import { getTrpcErrorMessage, trpc } from "@/lib/trpc";

export function useLogout() {
  const router = useRouter();
  const utils = trpc.useUtils();

  return trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate();
      toast.success("Signed out");
      router.push(ROUTES.login);
      router.refresh();
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "Unable to sign out"));
    },
  });
}

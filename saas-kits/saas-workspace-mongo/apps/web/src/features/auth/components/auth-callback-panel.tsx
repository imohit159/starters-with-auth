"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES } from "@/constants/api";
import { useMe } from "@/hooks/use-me";

export function AuthCallbackPanel() {
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    if (me.isSuccess) {
      router.replace(ROUTES.dashboard);
    }
    if (me.isError) {
      router.replace(ROUTES.login);
    }
  }, [me.isSuccess, me.isError, router]);

  return <p className="text-sm text-muted-foreground">Finishing Google sign-in...</p>;
}

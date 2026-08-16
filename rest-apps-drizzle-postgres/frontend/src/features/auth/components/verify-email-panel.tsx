"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/hooks/use-verify-email";

export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const verify = useVerifyEmail();

  useEffect(() => {
    if (token) {
      verify.mutate(token);
    }
    // Run once on mount for the token in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return <p className="text-sm text-destructive">This verification link is missing a token.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {verify.isPending ? "Verifying your email..." : "If this takes more than a moment, retry below."}
      </p>
      <Button type="button" variant="outline" disabled={verify.isPending} onClick={() => verify.mutate(token)}>
        Retry verification
      </Button>
    </div>
  );
}

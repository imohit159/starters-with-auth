"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { clientErrorMessage } from "@/lib/client-error";

export function GoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function continueWithGoogle() {
    setPending(true);
    setError(null);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (result.error) {
      setError(clientErrorMessage(result.error));
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" className="w-full" onClick={continueWithGoogle} disabled={pending}>
        {pending ? "Connecting..." : "Continue with Google"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

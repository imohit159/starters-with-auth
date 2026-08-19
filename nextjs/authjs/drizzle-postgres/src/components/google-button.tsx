"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function GoogleButton() {
  const [pending, setPending] = useState(false);
  return <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={() => { setPending(true); void signIn("google", { callbackUrl: "/dashboard" }); }}>{pending ? "Connecting..." : "Continue with Google"}</Button>;
}

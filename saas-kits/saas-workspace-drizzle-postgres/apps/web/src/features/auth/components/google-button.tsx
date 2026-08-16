"use client";

import { Button } from "@/components/ui/button";
import { getGoogleAuthUrl } from "@/services/auth.service";

export function GoogleButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        window.location.assign(getGoogleAuthUrl());
      }}
    >
      Continue with Google
      <span className="sr-only">{label}</span>
    </Button>
  );
}

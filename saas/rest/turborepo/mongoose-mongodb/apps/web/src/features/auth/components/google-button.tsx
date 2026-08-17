"use client";

import { Button } from "@/components/ui/button";
import { GOOGLE_AUTH_URL } from "@/constants/api";

export function GoogleButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        window.location.assign(GOOGLE_AUTH_URL);
      }}
    >
      Continue with Google
      <span className="sr-only">{label}</span>
    </Button>
  );
}

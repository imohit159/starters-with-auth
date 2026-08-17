"use client";

import { Button } from "@/components/ui/button";
import { useRevokeOtherSessions } from "@/hooks/use-revoke-other-sessions";
import { useSessions } from "@/hooks/use-sessions";

function formatWhen(value: string | null) {
  if (!value) {
    return "never";
  }
  return new Date(value).toLocaleString();
}

function describeDevice(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown device";
  }
  return userAgent.length > 60 ? `${userAgent.slice(0, 60)}...` : userAgent;
}

export function SessionList() {
  const sessions = useSessions();
  const revokeOthers = useRevokeOtherSessions();

  if (sessions.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading devices...</p>;
  }

  if (sessions.isError || !sessions.data) {
    return <p className="text-sm text-destructive">Unable to load your devices.</p>;
  }

  const others = sessions.data.filter((session) => !session.current).length;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {sessions.data.map((session) => (
          <li key={session.id} className="rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{describeDevice(session.userAgent)}</span>
              {session.current ? (
                <span className="text-xs text-muted-foreground">this device</span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {session.ip ?? "unknown ip"} &middot; last used {formatWhen(session.lastUsedAt)}
            </p>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        disabled={revokeOthers.isPending || others === 0}
        onClick={() => revokeOthers.mutate()}
      >
        {revokeOthers.isPending ? "Signing out..." : `Sign out other devices (${others})`}
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useInviteMember, useRemoveMember } from "@/hooks/use-org-mutations";
import { useMembers, useOrganization } from "@/hooks/use-orgs";

export function MembersPanel() {
  const { organizationId } = useActiveOrg();
  const org = useOrganization(organizationId);
  const members = useMembers(organizationId);
  const invite = useInviteMember();
  const remove = useRemoveMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const canManage = org.data?.role === "owner" || org.data?.role === "admin";

  if (!organizationId) {
    return <p className="text-sm text-muted-foreground">Select an organization first.</p>;
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Owner and admin can invite. The last owner cannot be removed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {members.data?.members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <div>
                <p className="font-medium">{member.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {member.email} · {member.role}
                </p>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove.mutate({ organizationId, userId: member.userId })}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite</CardTitle>
            <CardDescription>Sends an email with an accept link. The invitee must use the same email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                invite.mutate(
                  { organizationId, email, role },
                  {
                    onSuccess: () => setEmail(""),
                  },
                );
              }}
            >
              <div className="grid gap-1">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="h-9 rounded-lg border border-input bg-background px-2"
                  value={role}
                  onChange={(event) => setRole(event.target.value as "admin" | "member")}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={invite.isPending}>
                  {invite.isPending ? "Sending..." : "Send invite"}
                </Button>
              </div>
            </form>
            {members.data?.invites.length ? (
              <ul className="mt-4 grid gap-2 text-sm">
                {members.data.invites.map((item) => (
                  <li key={item.id} className="text-muted-foreground">
                    {item.email} · {item.role} · expires {new Date(item.expiresAt).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

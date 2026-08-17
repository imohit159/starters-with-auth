"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/hooks/use-change-password";
import { changePasswordSchema, type ChangePasswordValues } from "@/schemas/auth";

export function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={form.handleSubmit((values) =>
        changePassword.mutate(values, { onSuccess: () => form.reset() }),
      )}
    >
      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...form.register("currentPassword")}
        />
        {form.formState.errors.currentPassword ? (
          <p className="text-sm text-destructive">{form.formState.errors.currentPassword.message}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...form.register("newPassword")}
        />
        {form.formState.errors.newPassword ? (
          <p className="text-sm text-destructive">{form.formState.errors.newPassword.message}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={changePassword.isPending}>
        {changePassword.isPending ? "Updating..." : "Update password"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Changing your password signs out every other device.
      </p>
    </form>
  );
}

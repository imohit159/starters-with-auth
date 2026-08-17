"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/use-reset-password";
import { resetPasswordSchema, type ResetPasswordValues } from "@/schemas/auth";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const reset = useResetPassword();
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  if (!token) {
    return <p className="text-sm text-destructive">This reset link is missing a token.</p>;
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => reset.mutate({ token, password: values.password }))}
    >
      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={reset.isPending}>
        {reset.isPending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}

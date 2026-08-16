"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/api";
import { useForgotPassword } from "@/hooks/use-forgot-password";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/schemas/auth";

export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => forgot.mutate(values.email))}
    >
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={forgot.isPending}>
        {forgot.isPending ? "Sending..." : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href={ROUTES.login} className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

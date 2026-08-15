"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/api";
import { useRegister } from "@/hooks/use-register";
import { registerSchema, type RegisterValues } from "@/schemas/auth";
import { GoogleButton } from "./google-button";

export function RegisterForm() {
  const registerAccount = useRegister();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => registerAccount.mutate(values))}
    >
      <div className="grid gap-2">
        <Label htmlFor="displayName">Name</Label>
        <Input id="displayName" autoComplete="name" {...form.register("displayName")} />
        {form.formState.errors.displayName ? (
          <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={registerAccount.isPending}>
        {registerAccount.isPending ? "Creating account..." : "Create account"}
      </Button>
      <GoogleButton label="Sign up with Google" />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={ROUTES.login} className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

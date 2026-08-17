"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/api";
import { useLogout } from "@/hooks/use-logout";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

const links = [
  { href: ROUTES.dashboard, label: "Workspace" },
  { href: ROUTES.settings, label: "Members" },
  { href: ROUTES.billing, label: "Billing" },
];

export function WorkspaceShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const me = useMe();
  const logout = useLogout();
  const isAdmin = me.data?.roles.includes("admin") ?? false;

  return (
    <main className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">SaaS starter</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Link href={ROUTES.admin} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Admin
              </Link>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => logout.mutate()}>
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                buttonVariants({ variant: pathname === link.href ? "secondary" : "ghost", size: "sm" }),
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </main>
  );
}

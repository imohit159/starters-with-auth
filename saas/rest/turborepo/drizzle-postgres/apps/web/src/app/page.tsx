import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/api";

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          pnpm workspace + JSON REST
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">SaaS starter</h1>
        <p className="mt-3 text-muted-foreground">
          Auth, organizations, Stripe subscriptions, and an org-scoped todo sample. Express hosts a
          versioned JSON API. Next.js talks to it through a service layer and axios.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href={ROUTES.login} className={buttonVariants()}>
          Sign in
        </Link>
        <Link href={ROUTES.register} className={buttonVariants({ variant: "outline" })}>
          Create account
        </Link>
      </div>
    </main>
  );
}

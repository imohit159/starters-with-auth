import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/api";

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          pnpm workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Modular monolith</h1>
        <p className="mt-3 text-muted-foreground">
          Same Express 5 + Next.js auth stack, one lockfile and Turborepo. Run{" "}
          <code className="text-foreground">pnpm dev</code> from the root to start the API and web
          together.
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

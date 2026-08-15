import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/api";

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          pnpm workspace + tRPC
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Typed auth API</h1>
        <p className="mt-3 text-muted-foreground">
          Express 5 hosts tRPC. Next.js imports <code className="text-foreground">AppRouter</code>{" "}
          types from the workspace. Google OAuth stays an HTTP redirect. Cookies stay httpOnly.
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

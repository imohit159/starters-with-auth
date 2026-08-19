import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Next.js auth starter</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Better Auth, one full-stack app</h1>
        <p className="mt-3 text-muted-foreground">Email/password, Google OAuth, verification, password reset, and database-backed sessions with Drizzle and PostgreSQL.</p>
      </div>
      <div className="flex gap-3"><Link href="/login" className={buttonVariants()}>Sign in</Link><Link href="/register" className={buttonVariants({ variant: "outline" })}>Create account</Link></div>
    </main>
  );
}

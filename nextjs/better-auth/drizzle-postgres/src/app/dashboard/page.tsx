import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardPanel } from "@/components/dashboard-panel";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10"><DashboardPanel user={session.user} /></main>;
}

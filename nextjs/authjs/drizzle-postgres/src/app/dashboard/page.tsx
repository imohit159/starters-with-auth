import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardPanel } from "@/components/dashboard-panel";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10"><DashboardPanel user={session.user} /></main>;
}

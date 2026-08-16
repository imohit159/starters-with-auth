import { DashboardPanel } from "@/features/auth/components/dashboard-panel";

export default function DashboardPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <DashboardPanel />
    </main>
  );
}

import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";
import { AppThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js Full-stack Auth Starter",
  description: "Next.js, Drizzle, and PostgreSQL full-stack authentication starter",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AppThemeProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}

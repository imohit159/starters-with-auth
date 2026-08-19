import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Next.js Auth.js Starter", description: "Next.js, Auth.js, Drizzle, and PostgreSQL" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="h-full antialiased"><body className="min-h-full">{children}</body></html>;
}

import type { Metadata } from "next";
import { requireStudentAuth } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireStudentAuth("/dashboard");

  return children;
}

// Keep student data round trips in the database region (Supabase ap-southeast-2).
export const preferredRegion = "syd1";

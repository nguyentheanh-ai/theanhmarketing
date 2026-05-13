import type { Metadata } from "next";
import { requireStudentAuth } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function LearnLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireStudentAuth("/dashboard");

  return children;
}

import type { Metadata } from "next";

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
  return children;
}

// Keep student data round trips in the database region (Supabase ap-southeast-2).
export const preferredRegion = "syd1";

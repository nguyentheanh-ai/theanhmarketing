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

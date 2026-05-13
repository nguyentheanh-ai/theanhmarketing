import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#0b0b0c]">
      <SiteHeader />
      <div className="page-motion">{children}</div>
      <SiteFooter />
    </main>
  );
}

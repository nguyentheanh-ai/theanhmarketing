import type { ReactNode } from "react";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

export async function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="tam-public-shell min-h-screen">
      <Suspense fallback={<div className="h-16" />}>
        <SiteHeader />
      </Suspense>
      <div className="page-motion relative z-10">{children}</div>
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </main>
  );
}

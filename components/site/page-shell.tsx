import type { ReactNode } from "react";
import { SiteOfferPopup } from "@/components/site/offer-popup";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { getOfferSettings } from "@/services/offerService";

export async function PageShell({ children }: { children: ReactNode }) {
  const offer = await getOfferSettings();

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#0b0b0c]">
      <SiteHeader />
      <div className="page-motion">{children}</div>
      <SiteFooter />
      <SiteOfferPopup offer={offer} />
    </main>
  );
}

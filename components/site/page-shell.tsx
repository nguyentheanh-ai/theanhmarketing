import type { ReactNode } from "react";
import { CartToast } from "@/components/cart/cart-toast";
import { SiteOfferPopup } from "@/components/site/offer-popup";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { getOfferSettings } from "@/services/offerService";

export async function PageShell({ children }: { children: ReactNode }) {
  const offer = await getOfferSettings();

  return (
    <main className="ai-os-bg ai-grid min-h-screen text-white">
      <SiteHeader />
      <div className="page-motion relative z-10">{children}</div>
      <SiteFooter />
      <CartToast />
      <SiteOfferPopup offer={offer} />
    </main>
  );
}

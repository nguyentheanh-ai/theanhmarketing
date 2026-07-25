import type { ReactNode } from "react";
import { Suspense } from "react";
import { CartToast } from "@/components/cart/cart-toast";
import { SiteOfferPopup } from "@/components/site/offer-popup";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { getOfferSettings } from "@/services/offerService";

export async function PageShell({ children, showOfferPopup = true }: { children: ReactNode; showOfferPopup?: boolean }) {
  return (
    <main className="ai-os-bg ai-grid min-h-screen text-white">
      <Suspense fallback={<div className="h-14" />}>
        <SiteHeader />
      </Suspense>
      <div className="page-motion relative z-10">{children}</div>
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
      <CartToast />
      {showOfferPopup ? (
        <Suspense fallback={null}>
          <OfferPopupFromSettings />
        </Suspense>
      ) : null}
    </main>
  );
}

async function OfferPopupFromSettings() {
  const offer = await getOfferSettings();

  return <SiteOfferPopup offer={offer} />;
}

"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import type { OfferSettings } from "@/services/offerService";

const offerPopupSeenKey = "tam-offer-popup-seen";

export function SiteOfferPopup({
  contextTitle = "The Anh Marketing",
  offer,
}: {
  contextTitle?: string;
  offer: OfferSettings;
}) {
  const [isReady, setIsReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!offer.enabled) {
      return;
    }

    let shouldOpen = false;

    try {
      const hasSeenPopup = window.localStorage.getItem(offerPopupSeenKey) === "true";

      if (!hasSeenPopup) {
        window.localStorage.setItem(offerPopupSeenKey, "true");
        shouldOpen = true;
      }
    } catch {
      shouldOpen = false;
    } finally {
      window.setTimeout(() => {
        setIsOpen(shouldOpen);
        setIsReady(true);
      }, 0);
    }
  }, [offer.enabled]);

  if (!offer.enabled || !isReady) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        className="fixed bottom-6 left-5 z-50 rounded-full border-2 border-black bg-[#e7f3df] px-5 py-3 text-sm font-black shadow-[6px_6px_0_#111]"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {offer.discountLabel || "Ưu đãi"}
      </button>
    );
  }

  return (
    <aside className="fixed bottom-5 left-5 z-50 w-[min(380px,calc(100vw-2.5rem))] rounded-3xl border-2 border-black bg-white p-4 shadow-[8px_8px_0_#111]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-black tracking-[-0.04em]">{offer.title}</p>
          <p className="mt-1 text-sm font-semibold text-black/55">
            {offer.description || `Nhận tư vấn lộ trình và tài liệu phù hợp với ${contextTitle}.`}
          </p>
        </div>
        <button
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e7f3df] text-2xl font-black"
          type="button"
          onClick={() => setIsOpen(false)}
        >
          ×
        </button>
      </div>

      {offer.couponCode ? (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-[#2f8f62] bg-[#e7f3df] p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f6f4d]">
            {offer.discountLabel || "Mã giảm giá"}
          </p>
          <p className="mt-1 text-2xl font-black tracking-[0.08em] text-black">{offer.couponCode}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {offer.items.map((item) => (
          <div key={item} className="motion-card rounded-2xl border border-black/10 bg-[#fbfaf7] p-3">
            <p className="text-sm font-bold">{item}</p>
            <ButtonLink href={offer.ctaHref || "/dang-ky"} size="sm" className="mt-3">
              {offer.ctaLabel || "Nhận ưu đãi"}
            </ButtonLink>
          </div>
        ))}
      </div>
    </aside>
  );
}

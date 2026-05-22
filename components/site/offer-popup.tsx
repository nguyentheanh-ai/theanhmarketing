"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import type { OfferSettings } from "@/services/offerService";

const offerPopupSeenKey = "tam-offer-popup-seen";
const offerPopupDismissedKey = "tam-offer-popup-dismissed";

export function SiteOfferPopup({
  contextTitle = "The Anh Marketing",
  offer,
}: {
  contextTitle?: string;
  offer: OfferSettings;
}) {
  const [isReady, setIsReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!offer.enabled) {
      return;
    }

    let shouldOpen = false;
    let shouldDismiss = false;

    try {
      const hasSeenPopup = window.localStorage.getItem(offerPopupSeenKey) === "true";
      const hasDismissedPopup = window.localStorage.getItem(offerPopupDismissedKey) === "true";
      const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;

      if (hasDismissedPopup) {
        shouldDismiss = true;
      } else if (!hasSeenPopup && !isMobileViewport) {
        window.localStorage.setItem(offerPopupSeenKey, "true");
        shouldOpen = true;
      }
    } catch {
      shouldOpen = false;
    } finally {
      window.setTimeout(() => {
        setIsDismissed(shouldDismiss);
        setIsOpen(shouldOpen);
        setIsReady(true);
      }, 0);
    }
  }, [offer.enabled]);

  function dismissPopup() {
    setIsOpen(false);
    setIsDismissed(true);

    try {
      window.localStorage.setItem(offerPopupDismissedKey, "true");
    } catch {
      // The current state still hides the popup when storage is unavailable.
    }
  }

  if (!offer.enabled || !isReady || isDismissed) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="offer-popup-trigger-wrap fixed bottom-24 left-5 z-50 flex items-center gap-2 sm:bottom-6">
        <button
          className="offer-popup-trigger rounded-full border-2 border-[#061018] bg-[#8bdcff] px-5 py-3 text-sm font-black text-[#061018] shadow-[6px_6px_0_#111] transition hover:bg-[#b7ecff]"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          {offer.discountLabel || "Toolkit"}
        </button>
        <button
          aria-label="Tắt ưu đãi"
          className="offer-popup-trigger-close grid size-9 place-items-center rounded-full border-2 border-[#061018] bg-white text-lg font-black text-[#07111f] shadow-[4px_4px_0_#111] transition hover:bg-[#d6f3ff]"
          type="button"
          onClick={dismissPopup}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <aside className="offer-popup fixed bottom-24 left-5 z-50 w-[min(390px,calc(100vw-2.5rem))] rounded-3xl border-2 border-[#061018] bg-[#f8fcff] p-4 text-[#07111f] shadow-[8px_8px_0_#111] sm:bottom-5">
      <div className="offer-popup-head flex items-start justify-between gap-4">
        <div>
          <p className="offer-popup-title text-xl font-black tracking-[-0.04em] text-[#07111f]">{offer.title}</p>
          <p className="offer-popup-description mt-1 text-sm font-bold leading-6 text-[#334155]">
            {offer.description || `Nhận toolkit và chẩn đoán lộ trình phù hợp với ${contextTitle}.`}
          </p>
        </div>
        <button
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d6f3ff] text-2xl font-black text-[#07111f] transition hover:bg-[#b7ecff]"
          type="button"
          onClick={dismissPopup}
          aria-label="Đóng popup ưu đãi"
        >
          ×
        </button>
      </div>

      {offer.couponCode ? (
        <div className="offer-popup-coupon mt-4 rounded-2xl border-2 border-dashed border-[#0877a4] bg-[#d6f3ff] p-3 shadow-inner">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#075985]">
            {offer.discountLabel || "Mã giảm giá"}
          </p>
          <p className="mt-1 text-2xl font-black tracking-[0.08em] text-[#020617]">{offer.couponCode}</p>
        </div>
      ) : null}

      <div className="offer-popup-items mt-4 grid gap-3">
        {offer.items.map((item) => (
          <div key={item} className="offer-popup-item rounded-2xl border border-[#cbd5e1] bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition hover:border-[#159cfb]/60">
            <p className="text-sm font-bold leading-6 text-[#1f2937]">{item}</p>
            <ButtonLink href={offer.ctaHref || "/dang-ky"} size="sm" className="mt-3 !text-white">
              {offer.ctaLabel || "Nhận toolkit"}
            </ButtonLink>
          </div>
        ))}
      </div>
    </aside>
  );
}

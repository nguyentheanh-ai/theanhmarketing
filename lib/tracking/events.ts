import { CODEX_META_PIXEL_ID, isCodexLanding } from "../meta/codex-pixel";

export type MarketingEventName =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "CompleteRegistration"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "cta_click"
  | "demo_start"
  | "demo_complete"
  | "offer_view"
  | "form_start"
  | "form_error"
  | "payment_page_view";

type MarketingEventPayload = Record<string, string | number | boolean | string[] | number[] | null | undefined>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    codexPixelInitialized?: boolean;
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

function getEventId(payload: MarketingEventPayload) {
  const eventId = payload.event_id ?? payload.eventID;
  return typeof eventId === "string" || typeof eventId === "number" ? String(eventId) : "";
}

export function trackMarketingEvent(eventName: MarketingEventName, payload: MarketingEventPayload = {}) {
  if (!isBrowser()) {
    return;
  }

  const eventId = getEventId(payload);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...payload,
  });

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName === "PageView" ? "page_view" : eventName, payload);
  }

  if (typeof window.fbq === "function") {
    const options = eventId ? [{ eventID: eventId }] : [];
    // Never broadcast to a Pixel left initialized after client-side navigation.
    window.fbq("trackSingle", "1315653423712065", eventName, payload, ...options);
    const codexCheckout = window.location.pathname.startsWith("/thanh-toan/")
      && isCodexLanding(typeof payload.landing_page === "string" ? payload.landing_page : "");
    if (isCodexLanding(window.location.href) || codexCheckout) {
      if (!window.codexPixelInitialized) {
        window.fbq("set", "autoConfig", false, CODEX_META_PIXEL_ID);
        window.fbq("init", CODEX_META_PIXEL_ID);
        window.codexPixelInitialized = true;
      }
      const standard = ["PageView", "ViewContent", "Lead", "CompleteRegistration", "AddToCart", "InitiateCheckout", "Purchase"].includes(eventName);
      window.fbq(standard ? "trackSingle" : "trackSingleCustom", CODEX_META_PIXEL_ID, eventName, payload, ...options);
    }
  }
}

export function trackPageView(url: string, title?: string) {
  trackMarketingEvent("PageView", {
    page_location: url,
    page_title: title,
  });
}

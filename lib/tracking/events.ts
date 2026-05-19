export type MarketingEventName =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "CompleteRegistration"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

type MarketingEventPayload = Record<string, string | number | boolean | string[] | number[] | null | undefined>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function trackMarketingEvent(eventName: MarketingEventName, payload: MarketingEventPayload = {}) {
  if (!isBrowser()) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...payload,
  });

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName === "PageView" ? "page_view" : eventName, payload);
  }

  if (typeof window.fbq === "function") {
    window.fbq("track", eventName, payload);
  }
}

export function trackPageView(url: string, title?: string) {
  trackMarketingEvent("PageView", {
    page_location: url,
    page_title: title,
  });
}

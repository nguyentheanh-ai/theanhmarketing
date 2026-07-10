import { createHash } from "node:crypto";
import { normalizeEmail, normalizePhone } from "./normalize";

export type EventDestinationPayload = {
  eventId: string;
  contact?: {
    email?: string | null;
    phone?: string | null;
    consent?: boolean | null;
  };
  value?: number;
  currency?: string;
  courseId?: string;
  metadata?: Record<string, unknown>;
};

export interface EventDestination {
  trackLead(payload: EventDestinationPayload): Promise<{ ok: boolean; mocked?: boolean }>;
  trackQualifiedLead(payload: EventDestinationPayload): Promise<{ ok: boolean; mocked?: boolean }>;
  trackInitiateCheckout(payload: EventDestinationPayload): Promise<{ ok: boolean; mocked?: boolean }>;
  trackPurchase(payload: EventDestinationPayload): Promise<{ ok: boolean; mocked?: boolean }>;
  trackCourseEnroll(payload: EventDestinationPayload): Promise<{ ok: boolean; mocked?: boolean }>;
  trackCourseProgress(payload: EventDestinationPayload): Promise<{ ok: boolean; mocked?: boolean }>;
  trackUpsellIntent(payload: EventDestinationPayload): Promise<{ ok: boolean; mocked?: boolean }>;
}

export function hashProviderIdentifier(value?: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function normalizeDestinationContact(payload: EventDestinationPayload) {
  return {
    emailHash: hashProviderIdentifier(normalizeEmail(payload.contact?.email)),
    phoneHash: hashProviderIdentifier(normalizePhone(payload.contact?.phone)),
    consent: payload.contact?.consent !== false,
  };
}

class MockEventDestination implements EventDestination {
  async trackLead() {
    return { ok: true, mocked: true };
  }
  async trackQualifiedLead() {
    return { ok: true, mocked: true };
  }
  async trackInitiateCheckout() {
    return { ok: true, mocked: true };
  }
  async trackPurchase() {
    return { ok: true, mocked: true };
  }
  async trackCourseEnroll() {
    return { ok: true, mocked: true };
  }
  async trackCourseProgress() {
    return { ok: true, mocked: true };
  }
  async trackUpsellIntent() {
    return { ok: true, mocked: true };
  }
}

export class MetaCapiDestination extends MockEventDestination {}
export class GoogleEnhancedConversionsDestination extends MockEventDestination {}
export class TikTokEventsDestination extends MockEventDestination {}

export function createEventDestinations() {
  const destinations: EventDestination[] = [];
  destinations.push(process.env.META_CAPI_ACCESS_TOKEN ? new MetaCapiDestination() : new MockEventDestination());
  destinations.push(process.env.GOOGLE_ENHANCED_CONVERSIONS_ID ? new GoogleEnhancedConversionsDestination() : new MockEventDestination());
  destinations.push(process.env.TIKTOK_EVENTS_API_TOKEN ? new TikTokEventsDestination() : new MockEventDestination());
  return destinations;
}

export type MarketingSuppressionContact = {
  marketing_consent?: boolean | null;
  unsubscribed_at?: string | null;
  bounce_status?: string | null;
  complained_at?: string | null;
};

export function canSendMarketingEmail(contact: MarketingSuppressionContact) {
  if (contact.marketing_consent === false) return false;
  if (contact.unsubscribed_at) return false;
  if (contact.complained_at) return false;
  if (contact.bounce_status === "hard_bounce") return false;
  return true;
}

export function getSuppressionReason(contact: MarketingSuppressionContact) {
  if (contact.marketing_consent === false) return "marketing_consent_false";
  if (contact.unsubscribed_at) return "unsubscribed";
  if (contact.complained_at) return "complained";
  if (contact.bounce_status === "hard_bounce") return "hard_bounce";
  return null;
}

export function normalizeEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value || null;
}

export function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const hasPlus = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus && digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("0")) return `+84${digits.slice(1)}`;
  if (digits.length >= 9 && digits.length <= 10) return `+84${digits}`;
  return hasPlus ? `+${digits}` : digits;
}

export function maskEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const [name, domain] = normalized.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone?: string | null) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `${normalized.slice(0, 4)}***${normalized.slice(-3)}`;
}

export function makeContactDedupeKey(input: { email?: string | null; phone?: string | null }) {
  return normalizeEmail(input.email) ?? normalizePhone(input.phone) ?? null;
}

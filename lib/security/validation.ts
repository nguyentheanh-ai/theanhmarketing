const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+()\s.-]{8,24}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function cleanEmail(value: unknown) {
  return cleanText(value, 254).toLowerCase();
}

export function isValidEmail(value: string) {
  return emailPattern.test(value);
}

export function cleanPhone(value: unknown) {
  return cleanText(value, 24);
}

export function isValidPhone(value: string) {
  return phonePattern.test(value);
}

export function cleanSlug(value: unknown) {
  return cleanText(value, 120).toLowerCase();
}

export function isValidSlug(value: string) {
  return slugPattern.test(value);
}

export function cleanSlugList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(cleanSlug)
    .filter(Boolean)
    .filter(isValidSlug)
    .slice(0, 20);
}

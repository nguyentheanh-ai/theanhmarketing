export function parsePrice(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const numericValue = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

export function formatCurrency(value: string | number | null | undefined) {
  const numericValue = parsePrice(value);
  return numericValue ? new Intl.NumberFormat("vi-VN").format(numericValue) + "đ" : "";
}

export function getDiscountPercent(
  price: string | number | null | undefined,
  originalPrice: string | number | null | undefined,
) {
  const current = parsePrice(price);
  const original = parsePrice(originalPrice);

  if (!current || !original || current >= original) {
    return 0;
  }

  return Math.round((1 - current / original) * 100);
}

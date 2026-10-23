/** Bot 24/7 lifetime licence sold through the existing SePay order flow (fixed package, like the consultation fee). */
export const BOT247_PRODUCT_SLUG = "bot-24-7";
export const BOT247_PAYMENT_PLAN = "lifetime-990";
export const BOT247_PRODUCT_TITLE = "Bot 24/7 · Bản quyền trọn đời";
export const BOT247_PRICE_VND = 990_000;
export const BOT247_ACTIVATIONS = 5;

export function isBot247Order(input: { courseSlug: string; orderItems?: Array<{ slug: string }> }) {
  return input.courseSlug.split(",").map((item) => item.trim()).includes(BOT247_PRODUCT_SLUG)
    || input.orderItems?.some((item) => item.slug === BOT247_PRODUCT_SLUG) === true;
}

/** Machine id on the licence gateway for a paid order: stable, lowercase, 3–40 chars. */
export function bot247InstanceForOrder(orderCode: string) {
  return `don-${orderCode.toLowerCase().replace(/[^a-z0-9]/g, "")}`.slice(0, 40);
}

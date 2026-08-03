import { formatVnd } from "@/lib/payments/sepay";
import zbsContract from "@/tests/fixtures/zalo-zbs-contract.json";

export const ZNS_ELIGIBLE_COURSE_SLUGS = new Set([
  "facebook-ads-2026",
  "ebook-facebook-ads-2026",
]);

const templateKeys = [
  "customer_name",
  "product_name",
  "order_code",
  "amount",
  "transfer_content",
  "status",
] as const;

export type PendingPaymentZnsOrder = {
  orderCode: string;
  studentName: string;
  phone: string;
  courseSlug?: string | null;
  courseTitle?: string | null;
  amount: string | number;
  currency?: string | null;
  status: string;
  sepayReferenceCode?: string | null;
  orderItems?: Array<{
    slug?: string | null;
    title?: string | null;
    price?: number | null;
  }> | null;
};

export type PendingPaymentZbsPayload = {
  phone: string;
  trackingId: string;
  paymentUrl: string;
  templateData: Record<(typeof templateKeys)[number], string>;
};

function collectCourseSlugs(input: {
  courseSlug?: string | null;
  orderItems?: Array<{ slug?: string | null }> | null;
}) {
  const slugs = [
    ...String(input.courseSlug ?? "").split(","),
    ...(input.orderItems ?? []).map((item) => item.slug ?? ""),
  ]
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(slugs)];
}

export function isPendingPaymentZnsEligible(input: {
  courseSlug?: string | null;
  orderItems?: Array<{ slug?: string | null }> | null;
}) {
  const slugs = collectCourseSlugs(input);
  return (
    slugs.length > 0 &&
    slugs.every((slug) => ZNS_ELIGIBLE_COURSE_SLUGS.has(slug))
  );
}

export function normalizeVietnamMobileForZalo(phone: string):
  | { ok: true; phone: string }
  | { ok: false; reason: "missing_phone" | "invalid_phone" } {
  const raw = String(phone ?? "").trim();
  if (!raw) return { ok: false, reason: "missing_phone" };
  if (/[^\d+().\s-]/.test(raw)) return { ok: false, reason: "invalid_phone" };

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `84${digits.slice(1)}`;
  if (!/^84(?:3|5|7|8|9)\d{8}$/.test(digits)) {
    return { ok: false, reason: "invalid_phone" };
  }

  return { ok: true, phone: digits };
}

function normalizeOrderCode(orderCode: string) {
  const normalized = String(orderCode ?? "").trim().toUpperCase();
  if (!/^TAM[A-Z0-9]+$/.test(normalized) || normalized.length > 46) {
    throw new Error("invalid_order_code");
  }
  return normalized;
}

export function buildPendingPaymentUrl(orderCode: string) {
  const normalized = normalizeOrderCode(orderCode);
  return `https://www.theanhmarketing.com/thanh-toan/${normalized}?openBank=1`;
}

function assertTemplateContract() {
  const configuredKeys = zbsContract.template_variables;
  if (
    configuredKeys.length !== templateKeys.length ||
    configuredKeys.some((key, index) => key !== templateKeys[index])
  ) {
    throw new Error("zbs_template_contract_mismatch");
  }
}

function getProductName(order: PendingPaymentZnsOrder) {
  const title = String(order.courseTitle ?? "").trim();
  if (title) return title;

  const itemTitles = (order.orderItems ?? [])
    .map((item) => String(item.title ?? "").trim())
    .filter(Boolean);
  if (itemTitles.length > 0) return itemTitles.join(" + ");

  throw new Error("missing_product_name");
}

export function buildPendingPaymentZbsPayload(
  order: PendingPaymentZnsOrder,
): PendingPaymentZbsPayload {
  assertTemplateContract();
  if (order.status !== "pending") throw new Error("order_not_pending");
  if (!isPendingPaymentZnsEligible(order)) throw new Error("ineligible_product");

  const normalizedPhone = normalizeVietnamMobileForZalo(order.phone);
  if (!normalizedPhone.ok) throw new Error(normalizedPhone.reason);

  const orderCode = normalizeOrderCode(order.orderCode);
  const customerName = String(order.studentName ?? "").trim();
  if (!customerName) throw new Error("missing_customer_name");

  const amount = Number(order.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid_amount");

  return {
    phone: normalizedPhone.phone,
    trackingId: `PP${orderCode}`,
    paymentUrl: buildPendingPaymentUrl(orderCode),
    templateData: {
      customer_name: customerName,
      product_name: getProductName(order),
      order_code: orderCode,
      amount: formatVnd(amount),
      transfer_content: String(order.sepayReferenceCode || orderCode)
        .trim()
        .toUpperCase(),
      status: "Chờ thanh toán",
    },
  };
}

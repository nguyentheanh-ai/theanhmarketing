import { timingSafeEqual } from "crypto";

export type SepayWebhookPayload = {
  id?: string | number;
  gateway?: string;
  transactionDate?: string;
  transaction_date?: string;
  accountNumber?: string;
  account_number?: string;
  subAccount?: string;
  sub_account?: string;
  code?: string;
  content?: string;
  transactionContent?: string;
  transaction_content?: string;
  transferType?: string;
  transfer_type?: string;
  transferAmount?: number;
  transfer_amount?: number;
  accumulated?: number;
  referenceCode?: string;
  reference_code?: string;
  description?: string;
};

const orderPrefix = "TAM";

export function getSepayConfig() {
  return {
    bankCode: process.env.SEPAY_BANK_CODE ?? "",
    bankAccountNumber: process.env.SEPAY_BANK_ACCOUNT_NUMBER ?? "",
    bankAccountName: process.env.SEPAY_BANK_ACCOUNT_NAME ?? "",
    webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY ?? "",
  };
}

export function isSepayConfigured() {
  const config = getSepayConfig();
  return Boolean(config.bankCode && config.bankAccountNumber);
}

export function createOrderCode() {
  return `${orderPrefix}${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

export function createSepayQrUrl({
  amount,
  orderCode,
}: {
  amount: number;
  orderCode: string;
}) {
  const config = getSepayConfig();
  const params = new URLSearchParams({
    bank: config.bankCode,
    acc: config.bankAccountNumber,
    amount: String(Math.max(0, Math.round(amount))),
    des: orderCode,
  });

  return `https://qr.sepay.vn/img?${params.toString()}`;
}

export function parseVndAmount(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function formatVnd(value: string | number | null | undefined) {
  const amount = parseVndAmount(value);
  return amount > 0 ? `${new Intl.NumberFormat("vi-VN").format(amount)}đ` : "Đang cập nhật";
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifySepayApiKey(headers: Headers) {
  const { webhookApiKey } = getSepayConfig();

  if (!webhookApiKey) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = headers.get("authorization") ?? "";
  return safeEqual(authorization, `Apikey ${webhookApiKey}`);
}

export function getSepayOrderCode(payload: SepayWebhookPayload) {
  const directCode = String(payload.code ?? "").trim().toUpperCase();

  if (directCode) {
    return directCode;
  }

  const text = `${payload.content ?? ""} ${payload.transactionContent ?? ""} ${
    payload.transaction_content ?? ""
  } ${payload.description ?? ""}`.toUpperCase();
  const match = text.match(new RegExp(`${orderPrefix}[A-Z0-9]+`));

  return match?.[0] ?? "";
}

export function getSepayTransferAmount(payload: SepayWebhookPayload) {
  return parseVndAmount(payload.transferAmount ?? payload.transfer_amount ?? 0);
}

export function getSepayReference(payload: SepayWebhookPayload) {
  return String(payload.referenceCode ?? payload.reference_code ?? payload.id ?? "");
}

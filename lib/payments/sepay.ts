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

const bankNameMap: Record<string, string> = {
  VCB: "Vietcombank",
  TCB: "Techcombank",
  ACB: "ACB",
  MBB: "MB Bank",
  BIDV: "BIDV",
  ICB: "VietinBank",
  CTG: "VietinBank",
  VPB: "VPBank",
  TPB: "TPBank",
  STB: "Sacombank",
  VIB: "VIB",
  HDB: "HDBank",
  OCB: "OCB",
  SHB: "SHB",
  EIB: "Eximbank",
  MSB: "MSB",
  CAKE: "Cake by VPBank",
  Ubank: "Ubank",
  TIMO: "Timo",
};

export function getBankDisplayName(bankCode: string) {
  const normalized = bankCode.trim().toUpperCase();
  if (!normalized) {
    return "";
  }

  return bankNameMap[normalized] ?? normalized;
}

export function createVietQrUrl({
  amount,
  orderCode,
  accountName,
}: {
  amount: number;
  orderCode: string;
  accountName?: string;
}) {
  const config = getSepayConfig();
  const normalizedBank = config.bankCode.trim().toUpperCase();
  const normalizedAccount = config.bankAccountNumber.trim();

  if (!normalizedBank || !normalizedAccount) {
    return "";
  }

  const params = new URLSearchParams({
    amount: String(Math.max(0, Math.round(amount))),
    addInfo: orderCode.trim().toUpperCase(),
  });

  const name = (accountName ?? config.bankAccountName).trim();
  if (name) {
    params.set("accountName", name);
  }

  return `https://img.vietqr.io/image/${normalizedBank}-${normalizedAccount}-compact2.png?${params.toString()}`;
}

export function parseVndAmount(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const rawValue = String(value ?? "").trim();
  const digits = rawValue.replace(/[^\d]/g, "");

  if (!digits) {
    return 0;
  }

  const amount = Number(digits);

  if (/[kK]/.test(rawValue)) {
    return amount * 1000;
  }

  return amount;
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
    return process.env.NODE_ENV === "development";
  }

  const authorization = headers.get("authorization")?.trim() ?? "";
  const [scheme, ...rest] = authorization.split(/\s+/);
  const receivedKey = rest.join(" ");

  if (scheme.toLowerCase() !== "apikey" || !receivedKey) {
    return false;
  }

  return safeEqual(receivedKey, webhookApiKey);
}

export function isSepayAccountMatched(payload: SepayWebhookPayload) {
  const expectedAccount = getSepayConfig().bankAccountNumber.replace(/\D/g, "");
  const receivedAccount = String(payload.accountNumber ?? payload.account_number ?? "").replace(
    /\D/g,
    "",
  );

  return !expectedAccount || !receivedAccount || expectedAccount === receivedAccount;
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

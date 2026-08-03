import type { PaymentOrder } from "@/services/orderService";

type ResendEmailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type AccountingEmailOptions = {
  recipient?: string;
  from?: string;
};

export type AccountingEmailResult = {
  ok: boolean;
  skipped: boolean;
  reason: string | null;
  resendEmailId?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidRecipient(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getRecipient(options: AccountingEmailOptions) {
  return (options.recipient ?? process.env.ACCOUNTING_NOTIFICATION_EMAIL ?? "").trim().toLowerCase();
}

function getSender(options: AccountingEmailOptions) {
  return (
    options.from ??
    process.env.PAYMENT_SUCCESS_EMAIL_FROM ??
    process.env.REGISTRATION_NOTIFICATION_FROM ??
    "The Anh Marketing <noreply@theanhmarketing.com>"
  ).trim();
}

function formatPaidAt(value: string | null) {
  if (!value) return "Chưa ghi nhận";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa ghi nhận";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).format(date);
}

function getAmountLabel(order: PaymentOrder) {
  if (order.amountLabel.trim()) return order.amountLabel.trim();
  return `${new Intl.NumberFormat("vi-VN").format(order.amount)}đ`;
}

function buildRows(order: PaymentOrder) {
  const rows: Array<[string, string]> = [
    ["Tên khách", order.studentName || "Chưa có"],
    ["Số điện thoại", order.phone || "Chưa có"],
    ["Email", order.email || "Chưa có"],
    ["Khóa học / Sản phẩm / Dịch vụ", order.courseTitle || "Chưa có"],
    ["Giá bán", getAmountLabel(order)],
    ["Mã đơn", order.orderCode],
    ["Thời gian thanh toán", formatPaidAt(order.paidAt)],
    ["Phương thức thanh toán", order.paymentMethod || "Chưa có"],
  ];

  if (order.invoice.requested) {
    rows.push(
      ["Mã số thuế", order.invoice.taxCode],
      ["Tên công ty", order.invoice.companyName],
      ["Địa chỉ công ty", order.invoice.companyAddress],
      ["Email nhận hóa đơn", order.invoice.email],
    );
  }

  return rows;
}

export function buildAccountingPaymentEmailPayload(
  order: PaymentOrder,
  options: AccountingEmailOptions = {},
): ResendEmailPayload {
  const recipient = getRecipient(options);
  const rows = buildRows(order);
  const htmlRows = rows
    .map(([label, value]) => `<tr><td style="padding:8px 12px;border:1px solid #dbe3ee;font-weight:700;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #dbe3ee">${escapeHtml(value)}</td></tr>`)
    .join("");
  const invoiceNote = order.invoice.requested
    ? "<p style=\"margin:16px 0 0;color:#b45309;font-weight:700\">Khách đã yêu cầu xuất hóa đơn.</p>"
    : "";

  return {
    from: getSender(options),
    to: recipient,
    subject: `[Kế toán] Đã thanh toán - ${order.orderCode}`,
    html: `<div style="font-family:Arial,'Helvetica Neue',sans-serif;line-height:1.6;color:#0f172a"><h1 style="font-size:22px;margin:0 0 16px">Thông báo khách đã thanh toán</h1><table style="border-collapse:collapse;width:100%;max-width:720px">${htmlRows}</table>${invoiceNote}</div>`,
    text: [
      "THÔNG BÁO KHÁCH ĐÃ THANH TOÁN",
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      ...(order.invoice.requested ? ["", "Khách đã yêu cầu xuất hóa đơn."] : []),
    ].join("\n"),
  };
}

export async function sendAccountingPaymentEmail(
  order: PaymentOrder,
  options: AccountingEmailOptions = {},
): Promise<AccountingEmailResult> {
  const recipient = getRecipient(options);
  if (!isValidRecipient(recipient)) {
    return {
      ok: false,
      skipped: true,
      reason: "Missing or invalid ACCOUNTING_NOTIFICATION_EMAIL",
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim().replace(/^\uFEFF/, "") ?? "";
  if (!apiKey) {
    return { ok: false, skipped: true, reason: "Missing RESEND_API_KEY" };
  }

  try {
    const payload = buildAccountingPaymentEmailPayload(order, { ...options, recipient });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
        "Idempotency-Key": `accounting-paid-${order.orderCode}`,
      },
      body: Buffer.from(JSON.stringify(payload), "utf8"),
    });

    if (!response.ok) {
      const reason = (await response.text()) || response.statusText || "Resend rejected accounting email.";
      return { ok: false, skipped: false, reason: reason.slice(0, 1000) };
    }

    const result = typeof response.json === "function"
      ? await response.json().catch(() => null) as { id?: unknown } | null
      : null;
    return {
      ok: true,
      skipped: false,
      reason: null,
      resendEmailId: typeof result?.id === "string" ? result.id : null,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message.slice(0, 1000) : "Could not send accounting email.",
    };
  }
}

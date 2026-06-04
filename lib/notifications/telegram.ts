import type { PaymentOrder } from "@/services/orderService";

export type TelegramOrderEvent = "order_created" | "payment_paid";

type TelegramSendOptions = {
  botToken?: string;
  chatId?: string;
  siteUrl?: string;
  fetchImpl?: typeof fetch;
};

type TelegramSendResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  status?: number;
};

function cleanEnvValue(value: string | undefined) {
  return (value ?? "").replace(/^\uFEFF/, "").trim().replace(/^['"]|['"]$/g, "");
}

function getSiteUrl(options?: TelegramSendOptions) {
  return cleanEnvValue(options?.siteUrl) || cleanEnvValue(process.env.NEXT_PUBLIC_SITE_URL) || "https://www.theanhmarketing.com";
}

function getEventTitle(event: TelegramOrderEvent) {
  return event === "payment_paid" ? "[PAID]" : "[NEW ORDER]";
}

export function buildTelegramOrderMessage(order: PaymentOrder, event: TelegramOrderEvent, options?: TelegramSendOptions) {
  const paymentUrl = `${getSiteUrl(options)}/thanh-toan/${encodeURIComponent(order.orderCode)}`;
  const paidLine = order.paidAt ? [`Paid at: ${order.paidAt}`] : [];

  return [
    `${getEventTitle(event)} The Anh Marketing`,
    `Ma don: ${order.orderCode}`,
    `Khach: ${order.studentName || "Chua co ten"}`,
    `SDT: ${order.phone || "Chua co SDT"}`,
    `Email: ${order.email || "Chua co email"}`,
    `San pham: ${order.courseTitle || order.courseSlug || "Chua ro san pham"}`,
    `So tien: ${order.amountLabel || `${order.amount} ${order.currency}`}`,
    `Trang thai: ${order.status}`,
    ...paidLine,
    `Link: ${paymentUrl}`,
  ].join("\n");
}

export async function sendTelegramOrderNotification(
  order: PaymentOrder,
  event: TelegramOrderEvent,
  options: TelegramSendOptions = {},
): Promise<TelegramSendResult> {
  const botToken = cleanEnvValue(options.botToken) || cleanEnvValue(process.env.TELEGRAM_BOT_TOKEN);
  const chatId = cleanEnvValue(options.chatId) || cleanEnvValue(process.env.TELEGRAM_CHAT_ID);

  if (!botToken || !chatId) {
    return {
      ok: true,
      skipped: true,
      reason: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID",
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildTelegramOrderMessage(order, event, options),
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      reason: "Telegram Bot API rejected the message.",
      status: response.status,
    };
  }

  return { ok: true, skipped: false, status: response.status };
}

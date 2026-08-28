import { buildPendingPaymentEmailPayload } from "@/lib/notifications/pending-payment-email";
import { normalizeAttribution } from "@/lib/tracking/attribution";
import { emptyInvoiceDetails } from "@/lib/orders/invoice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordEmailLog } from "@/services/emailLogService";
import type { PaymentOrder } from "@/services/orderService";

type ClaimedRun = {
  run_id: string;
  order_id: string;
  order_code: string;
  sequence_index: 1 | 2;
  lease_token: string;
};

type OrderRow = {
  id: string;
  lead_id: string | null;
  order_code: string;
  student_name: string | null;
  email: string | null;
  phone: string | null;
  course_slug: string | null;
  course_title: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  payment_method: string | null;
  payment_qr_url: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  sepay_reference_code: string | null;
  order_items: PaymentOrder["orderItems"] | null;
};

type DispatchSummary = {
  ok: boolean;
  claimed: number;
  sent: number;
  cancelled: number;
  retried: number;
  lostLease: number;
  error?: string;
};

const orderFields =
  "id,lead_id,order_code,student_name,email,phone,course_slug,course_title,amount,currency,status,payment_method,payment_qr_url,paid_at,expires_at,created_at,sepay_reference_code,order_items" as const;

const reminderSubjects = {
  1: (orderCode: string) => `Anh/chị còn một bước để hoàn tất đăng ký - ${orderCode}`,
  2: (orderCode: string) => `Nhắc lại: đơn đăng ký vẫn đang chờ thanh toán - ${orderCode}`,
} as const;

const reminderHeadings = {
  1: "Anh/chị còn một bước để hoàn tất đăng ký.",
  2: "Em nhắc lại để anh/chị không bỏ lỡ đơn đăng ký này.",
} as const;

function parseRuns(value: unknown): ClaimedRun[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is ClaimedRun => {
    if (!item || typeof item !== "object") return false;
    const run = item as Partial<ClaimedRun>;
    return (
      typeof run.run_id === "string" &&
      typeof run.order_id === "string" &&
      typeof run.order_code === "string" &&
      (run.sequence_index === 1 || run.sequence_index === 2) &&
      typeof run.lease_token === "string"
    );
  });
}

function formatVnd(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

function toPaymentOrder(row: OrderRow): PaymentOrder {
  const amount = Number(row.amount ?? 0);

  return {
    id: row.id,
    leadId: row.lead_id,
    orderCode: row.order_code,
    studentName: row.student_name ?? "",
    email: row.email?.trim() ?? "",
    phone: row.phone ?? "",
    courseSlug: row.course_slug ?? "",
    courseTitle: row.course_title ?? "",
    amount,
    amountLabel: formatVnd(amount),
    currency: row.currency ?? "VND",
    status: row.status === "paid" || row.status === "failed" || row.status === "expired" ? row.status : "pending",
    paymentMethod: row.payment_method ?? "sepay",
    paymentQrUrl: row.payment_qr_url ?? "",
    paidAt: row.paid_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at ?? "",
    sepayReferenceCode: row.sepay_reference_code,
    orderItems: row.order_items ?? [],
    paymentEmailSentAt: null,
    paymentEmailLastError: null,
    accountingEmailSentAt: null,
    accountingEmailLastError: null,
    purchaseEventSent: false,
    attribution: normalizeAttribution(),
    invoice: emptyInvoiceDetails,
  };
}

export function buildPaymentReminderEmailPayload(order: PaymentOrder, sequenceIndex: 1 | 2) {
  const payload = buildPendingPaymentEmailPayload(order);
  const heading = reminderHeadings[sequenceIndex];
  const reminderBlock = `<div style="margin:0 0 22px;padding:16px 18px;border-radius:12px;background:#2a211c;border:1px solid #6a3d25;color:#f6f1e7;font-size:15px;line-height:1.7"><strong style="color:#f66628">${heading}</strong><br />Nếu anh/chị đã thanh toán, vui lòng bỏ qua email này.</div>`;

  return {
    ...payload,
    subject: reminderSubjects[sequenceIndex](order.orderCode),
    html: payload.html.replace('<td style="padding:34px">', `<td style="padding:34px">${reminderBlock}`),
    text: `${heading}\nNếu anh/chị đã thanh toán, vui lòng bỏ qua email này.\n\n${payload.text}`,
  };
}

async function sendWithResend(run: ClaimedRun, order: PaymentOrder) {
  const apiKey = process.env.RESEND_API_KEY?.trim().replace(/^\uFEFF/, "");
  if (!apiKey) {
    return { ok: false as const, resendEmailId: null, error: "Missing RESEND_API_KEY" };
  }

  const payload = buildPaymentReminderEmailPayload(order, run.sequence_index);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
      "Idempotency-Key": `payment-reminder/${run.run_id}`,
    },
    body: Buffer.from(JSON.stringify(payload), "utf8"),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

  if (!response.ok || !body.id) {
    return {
      ok: false as const,
      resendEmailId: null,
      error: body.message?.slice(0, 500) || `Resend request failed (${response.status})`,
    };
  }

  return { ok: true as const, resendEmailId: body.id, error: null };
}

export async function dispatchDuePaymentReminderRuns(): Promise<DispatchSummary> {
  const summary: DispatchSummary = {
    ok: true,
    claimed: 0,
    sent: 0,
    cancelled: 0,
    retried: 0,
    lostLease: 0,
  };
  const client = createSupabaseAdminClient();

  if (!client) return { ...summary, ok: false, error: "Missing Supabase admin client" };

  const claimed = await client.rpc("claim_due_payment_remarketing_runs", { p_limit: 10 });
  if (claimed.error) return { ...summary, ok: false, error: "Could not claim payment reminder runs" };

  const runs = parseRuns(claimed.data);
  summary.claimed = runs.length;

  for (const run of runs) {
    const orderResult = await client.from("orders").select(orderFields).eq("id", run.order_id).maybeSingle();
    const order = orderResult.data ? toPaymentOrder(orderResult.data as OrderRow) : null;

    if (orderResult.error) {
      const finished = await client.rpc("finish_payment_remarketing_run", {
        p_run_id: run.run_id,
        p_lease_token: run.lease_token,
        p_succeeded: false,
        p_resend_email_id: null,
        p_error: "Could not recheck order",
      });
      if (finished.error) summary.lostLease += 1;
      else summary.retried += 1;
      continue;
    }

    if (!order || order.status !== "pending" || !order.email) {
      const cancelled = await client.rpc("cancel_payment_remarketing_run", {
        p_run_id: run.run_id,
        p_lease_token: run.lease_token,
        p_reason: "Order is no longer pending",
      });
      const finishState = String((cancelled.data as { finish_state?: string } | null)?.finish_state ?? "");
      if (cancelled.error || finishState === "lost_lease") summary.lostLease += 1;
      else summary.cancelled += 1;
      continue;
    }

    let result: Awaited<ReturnType<typeof sendWithResend>>;
    try {
      result = await sendWithResend(run, order);
    } catch {
      result = { ok: false, resendEmailId: null, error: "Resend request failed" };
    }

    if (result.ok && result.resendEmailId) {
      const payload = buildPaymentReminderEmailPayload(order, run.sequence_index);
      await recordEmailLog({
        leadId: order.leadId,
        email: order.email,
        subject: payload.subject,
        templateKey: `payment_reminder_${run.sequence_index}`,
        resendEmailId: result.resendEmailId,
        status: "sent",
        metadata: {
          kind: "payment_reminder",
          payment_remarketing_run_id: run.run_id,
          orderCode: order.orderCode,
          sequenceIndex: run.sequence_index,
        },
      });
    }

    const finished = await client.rpc("finish_payment_remarketing_run", {
      p_run_id: run.run_id,
      p_lease_token: run.lease_token,
      p_succeeded: result.ok,
      p_resend_email_id: result.resendEmailId,
      p_error: result.error,
    });
    const finishState = String((finished.data as { finish_state?: string } | null)?.finish_state ?? "");

    if (finished.error || finishState === "lost_lease") summary.lostLease += 1;
    else if (result.ok) summary.sent += 1;
    else summary.retried += 1;
  }

  return summary;
}

import { NextResponse } from "next/server";

import { assertCanRunLiveEmailAction, sendCrmV2PaymentReminder } from "@/lib/crm-v2/email-actions";
import { getCrmV2MissingLiveConfigMessage, shouldUseCrmV2DemoData } from "@/lib/crm-v2/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCrmV2OwnerRequest } from "../../_shared";

const orderActionValues = new Set(["send_payment_reminder"]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:orders:actions");
  if (blocked) return blocked;

  const body = asRecord(await request.json().catch(() => null));
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!orderActionValues.has(action)) {
    return NextResponse.json({ ok: false, message: "Order action không hợp lệ." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" && body.orderId.trim() ? body.orderId.trim() : "";
  const client = createSupabaseAdminClient();
  if (shouldUseCrmV2DemoData()) {
    return NextResponse.json({ ok: true, action, mocked: true, message: "send_payment_reminder: safe mock mode vì thiếu live CRM v2 schema/env." });
  }
  if (!client) return NextResponse.json({ ok: false, message: getCrmV2MissingLiveConfigMessage("send_payment_reminder") }, { status: 503 });
  if (!isUuid(orderId)) {
    return NextResponse.json({ ok: false, message: "Thiếu orderId CRM v2 hợp lệ để gửi nhắc thanh toán thật." }, { status: 400 });
  }

  const liveEmailConfig = assertCanRunLiveEmailAction(action);
  if (!liveEmailConfig.ok) {
    return NextResponse.json({ ok: false, message: liveEmailConfig.message }, { status: 503 });
  }

  let contactId: string | null = null;
  let leadId: string | null = null;
  const { data: order } = await client.schema("crm_v2").from("orders").select("contact_id,lead_id").eq("id", orderId).maybeSingle();
  contactId = typeof order?.contact_id === "string" ? order.contact_id : null;
  leadId = typeof order?.lead_id === "string" ? order.lead_id : null;

  const emailResult = await sendCrmV2PaymentReminder({ client, orderId });

  const { data: task, error } = await client
    .schema("crm_v2")
    .from("tasks")
    .insert({
      contact_id: contactId,
      lead_id: leadId,
      title: "Nhắc thanh toán đơn hàng",
      status: "open",
      priority: "high",
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        action,
        order_id: orderId,
        source: "crm-v2-orders-ui",
        email_send_queued: true,
        email_result: emailResult,
      },
    })
    .select("id,title,status,priority")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: emailResult.ok,
    action,
    task,
    email: emailResult,
    message: emailResult.ok ? "send_payment_reminder: đã gửi email nhắc thanh toán và tạo task thu hồi." : emailResult.message,
  });
}

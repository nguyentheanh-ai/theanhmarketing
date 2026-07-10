import { NextResponse } from "next/server";

import { getCrmV2MissingLiveConfigMessage, shouldUseCrmV2DemoData } from "@/lib/crm-v2/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCrmV2OwnerRequest } from "../../_shared";

const studentActionValues = new Set(["create_support_ticket"]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:students:actions");
  if (blocked) return blocked;

  const body = asRecord(await request.json().catch(() => null));
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!studentActionValues.has(action)) {
    return NextResponse.json({ ok: false, message: "Student action không hợp lệ." }, { status: 400 });
  }

  const contactId = typeof body.contactId === "string" && isUuid(body.contactId) ? body.contactId : null;
  const subject = typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : "CRM v2 CSKH follow-up";
  const client = createSupabaseAdminClient();
  if (shouldUseCrmV2DemoData()) {
    return NextResponse.json({ ok: true, action, mocked: true, message: "create_support_ticket: safe mock mode vì thiếu live CRM v2 schema/env." });
  }
  if (!client) return NextResponse.json({ ok: false, message: getCrmV2MissingLiveConfigMessage("create_support_ticket") }, { status: 503 });

  const { data: ticket, error } = await client
    .schema("crm_v2")
    .from("support_tickets")
    .insert({
      contact_id: contactId,
      subject,
      status: "open",
      priority: "normal",
      metadata: {
        action,
        requested_contact_id: typeof body.contactId === "string" ? body.contactId : null,
        source: "crm-v2-students-ui",
      },
    })
    .select("id,subject,status,priority")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action, ticket, message: "create_support_ticket: đã tạo ticket CSKH." });
}

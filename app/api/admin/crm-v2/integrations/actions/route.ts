import { NextResponse } from "next/server";

import { getCrmV2MissingLiveConfigMessage, shouldUseCrmV2DemoData } from "@/lib/crm-v2/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCrmV2OwnerRequest } from "../../_shared";

const integrationActionValues = new Set(["test_connection"]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function POST(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:integrations:actions");
  if (blocked) return blocked;

  const body = asRecord(await request.json().catch(() => null));
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!integrationActionValues.has(action)) {
    return NextResponse.json({ ok: false, message: "Integration action không hợp lệ." }, { status: 400 });
  }

  const provider = typeof body.provider === "string" && body.provider.trim() ? body.provider.trim() : "resend";
  const client = createSupabaseAdminClient();
  if (shouldUseCrmV2DemoData()) {
    return NextResponse.json({ ok: true, action, mocked: true, message: "test_connection: safe mock mode vì thiếu live CRM v2 schema/env." });
  }
  if (!client) return NextResponse.json({ ok: false, message: getCrmV2MissingLiveConfigMessage("test_connection") }, { status: 503 });

  const checkedAt = new Date().toISOString();
  const { data: account, error: accountError } = await client
    .schema("crm_v2")
    .from("integration_accounts")
    .upsert(
      {
        provider,
        account_name: "default",
        status: "mock",
        config: {
          mode: "test_connection",
          secrets_in_code: false,
        },
        last_sync_at: checkedAt,
        updated_at: checkedAt,
      },
      { onConflict: "provider,account_name" },
    )
    .select("id,provider,status,last_sync_at")
    .single();

  if (accountError) {
    return NextResponse.json({ ok: false, message: accountError.message }, { status: 500 });
  }

  const { data: webhook, error: webhookError } = await client
    .schema("crm_v2")
    .from("webhook_events")
    .insert({
      provider,
      event_type: "connection_test",
      event_id: `crm-v2-test-${provider}-${Date.now()}`,
      payload: {
        action,
        provider,
        account_id: account?.id,
        raw_pii_sent: false,
      },
      processed_at: checkedAt,
      status: "processed",
    })
    .select("id,event_type,status")
    .single();

  if (webhookError) {
    return NextResponse.json({ ok: false, message: webhookError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action, account, webhook, message: "test_connection: đã ghi webhook test kết nối." });
}

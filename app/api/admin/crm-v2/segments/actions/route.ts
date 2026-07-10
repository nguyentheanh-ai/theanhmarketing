import { NextResponse } from "next/server";

import { getCrmV2MissingLiveConfigMessage, shouldUseCrmV2DemoData } from "@/lib/crm-v2/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCrmV2OwnerRequest } from "../../_shared";

const segmentActionValues = new Set(["save_segment"]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function makeSlug(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `segment-${new Date().toISOString().slice(0, 10)}`;
}

export async function POST(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:segments:actions");
  if (blocked) return blocked;

  const body = asRecord(await request.json().catch(() => null));
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!segmentActionValues.has(action)) {
    return NextResponse.json({ ok: false, message: "Segment action không hợp lệ." }, { status: 400 });
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "CRM v2 smart segment";
  const rules = Object.keys(asRecord(body.rules)).length > 0 ? asRecord(body.rules) : { combinator: "and", conditions: [] };
  const client = createSupabaseAdminClient();
  if (shouldUseCrmV2DemoData()) {
    return NextResponse.json({ ok: true, action, mocked: true, message: "save_segment: safe mock mode vì thiếu live CRM v2 schema/env." });
  }
  if (!client) return NextResponse.json({ ok: false, message: getCrmV2MissingLiveConfigMessage("save_segment") }, { status: 503 });

  const slug = makeSlug(name);
  const { data: segment, error: segmentError } = await client
    .schema("crm_v2")
    .from("segments")
    .upsert(
      {
        name,
        slug,
        description: "Created from CRM v2 segment builder",
        status: "draft",
        audience_goal: typeof body.goal === "string" ? body.goal : "remarketing",
        channel: typeof body.channel === "string" ? body.channel : "email",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id,name,slug,version")
    .single();

  if (segmentError || !segment) {
    return NextResponse.json({ ok: false, message: segmentError?.message || "Không lưu được segment." }, { status: 500 });
  }

  const { data: latestRule } = await client
    .schema("crm_v2")
    .from("segment_rules")
    .select("version")
    .eq("segment_id", segment.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = Number(latestRule?.version || 0) + 1;
  const { data: rule, error: ruleError } = await client
    .schema("crm_v2")
    .from("segment_rules")
    .insert({
      segment_id: segment.id,
      version: nextVersion,
      rules,
    })
    .select("id,version")
    .single();

  if (ruleError) {
    return NextResponse.json({ ok: false, message: ruleError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    action,
    segment,
    rule,
    message: `save_segment: đã lưu segment ${name} version ${nextVersion}.`,
  });
}

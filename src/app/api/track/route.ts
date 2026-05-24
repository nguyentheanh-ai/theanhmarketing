import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

const allowedEventTypes = new Set([
  "phone_click",
  "zalo_click",
  "messenger_click",
  "cta_click",
  "form_submit",
  "scroll_depth",
  "pricing_view",
  "add_to_cart",
  "checkout_start",
  "payment_success",
  "payment_failed",
]);

function normalizeEventType(value: unknown) {
  if (value === "view_pricing") {
    return "pricing_view";
  }

  if (value === "start_checkout") {
    return "checkout_start";
  }

  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  const eventType = normalizeEventType(payload?.event_type);

  if (!payload || !allowedEventTypes.has(eventType)) {
    return NextResponse.json({ error: "Invalid tracking payload" }, { status: 400 });
  }

  const record = {
    lead_id: payload.lead_id ?? null,
    user_id: payload.user_id ?? null,
    session_id: payload.session_id ?? null,
    course_id: payload.course_id ?? null,
    landing_page_id: payload.landing_page_id ?? null,
    event_name: payload.event_name ?? eventType,
    event_type: eventType,
    button_name: payload.button_name ?? null,
    page_url: payload.page_url ?? request.headers.get("referer") ?? null,
    referrer: payload.referrer ?? request.headers.get("referer") ?? null,
    utm_source: payload.utm_source ?? null,
    utm_medium: payload.utm_medium ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    device_type: payload.device_type ?? null,
    browser: request.headers.get("user-agent")?.slice(0, 120) ?? null,
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    country: payload.country ?? null,
    city: payload.city ?? null,
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
  };

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ accepted: true, mode: "local-preview", record }, { status: 202 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("click_events").insert(record);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ accepted: true });
}

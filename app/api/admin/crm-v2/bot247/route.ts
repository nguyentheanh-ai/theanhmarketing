import { NextResponse } from "next/server";
import { requireCrmV2OwnerRequest } from "../_shared";
import { getBot247AdminSnapshot } from "@/lib/bot247/license-admin";

export async function GET(request: Request) {
  const denied = await requireCrmV2OwnerRequest(request, "admin:crm-v2:bot247");
  if (denied) return denied;
  return NextResponse.json({ ok: true, ...(await getBot247AdminSnapshot()) }, { headers: { "Cache-Control": "private, no-store" } });
}

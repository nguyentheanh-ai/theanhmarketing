import { NextResponse } from "next/server";

import { getCrmV2EmailCampaignKpis, listCrmV2EmailCampaigns, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import { requireCrmV2OwnerRequest } from "../_shared";

export async function GET(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:email");
  if (blocked) return blocked;

  const url = new URL(request.url);
  const query = normalizeCrmListQuery(Object.fromEntries(url.searchParams.entries()));
  const [campaigns, kpis] = await Promise.all([listCrmV2EmailCampaigns(query), getCrmV2EmailCampaignKpis()]);

  return NextResponse.json({ ok: true, campaigns, kpis });
}

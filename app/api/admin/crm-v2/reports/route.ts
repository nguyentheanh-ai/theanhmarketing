import { NextResponse } from "next/server";

import { getCrmV2ReportSnapshot } from "@/lib/crm-v2/data";
import { requireCrmV2OwnerRequest } from "../_shared";
import { normalizeCrmListQuery } from "@/lib/crm-v2/query";

export async function GET(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:reports");
  if (blocked) return blocked;
  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());
  const query = normalizeCrmListQuery(rawQuery);

  const snapshot = await getCrmV2ReportSnapshot(query);
  const dashboard = snapshot.dashboard;

  return NextResponse.json({ ok: true, snapshot, dashboard });
}

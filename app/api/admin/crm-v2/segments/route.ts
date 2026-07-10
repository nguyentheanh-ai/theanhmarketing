import { NextResponse } from "next/server";

import { listCrmV2SegmentsRows, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import { requireCrmV2OwnerRequest } from "../_shared";

export async function GET(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:segments");
  if (blocked) return blocked;

  const url = new URL(request.url);
  const query = normalizeCrmListQuery(Object.fromEntries(url.searchParams.entries()));
  const result = await listCrmV2SegmentsRows(query);

  return NextResponse.json({ ok: true, ...result });
}

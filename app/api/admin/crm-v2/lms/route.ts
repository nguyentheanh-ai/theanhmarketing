import { NextResponse } from "next/server";

import { getAdminLmsSnapshot } from "@/services/lmsService";
import { requireCrmV2OwnerRequest } from "../_shared";

export async function GET(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:lms");
  if (blocked) return blocked;

  const url = new URL(request.url);
  const selectedCourseSlug = url.searchParams.get("course") || url.searchParams.get("courseSlug");
  const snapshot = await getAdminLmsSnapshot({ selectedCourseSlug });

  return NextResponse.json(snapshot, { status: snapshot.ok ? 200 : 503 });
}

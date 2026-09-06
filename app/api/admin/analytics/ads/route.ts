import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import { getAnalyticsSelection } from "@/lib/crm-v2/analytics";
import { getMetaAdsReport } from "@/services/metaAdsReportService";

export async function GET(request: Request) {
  const { adminRole } = await getCurrentAuth();
  if (!canAccessAdminRole(adminRole, ["owner"])) return NextResponse.json({ error: "Không có quyền xem quảng cáo." }, { status: 403 });
  try {
    const selection = getAnalyticsSelection(Object.fromEntries(new URL(request.url).searchParams));
    const report = await getMetaAdsReport(selection.range);
    return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Không tải được dữ liệu quảng cáo cho kỳ đã chọn." }, { status: 400 });
  }
}

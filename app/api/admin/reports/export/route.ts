import { createAggregateReportCsv, getUnavailableAggregateSources } from "@/lib/admin/report-export";
import { createPrivateNoStoreJson } from "@/lib/admin/report-response";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import {
  getSoloCommandCenterModel,
  resolveCommandCenterRange,
} from "@/services/adminCommandCenterService";

export async function GET(request: Request) {
  const { adminRole } = await getCurrentAuth();

  if (!canAccessAdminRole(adminRole, ["owner"])) {
    return createPrivateNoStoreJson(
      { ok: false, message: "Bạn cần quyền owner để xuất báo cáo." },
      403,
    );
  }

  const url = new URL(request.url);
  const range = resolveCommandCenterRange({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  const model = await getSoloCommandCenterModel(range);
  const unavailableSources = getUnavailableAggregateSources(model.dataStatus);

  if (unavailableSources.length > 0) {
    return createPrivateNoStoreJson(
      {
        ok: false,
        message: "Không thể xuất báo cáo vì nguồn tổng hợp chưa sẵn sàng.",
        unavailableSources,
      },
      503,
    );
  }

  const filename = `bao-cao-tong-hop-${range.from}-${range.to}.csv`;
  return new Response(createAggregateReportCsv(model), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

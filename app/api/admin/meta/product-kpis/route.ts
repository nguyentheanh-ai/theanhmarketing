import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function isMissingSchemaError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("does not exist");
}

export async function PATCH(request: Request) {
  const { isAdmin, adminRole } = await getCurrentAuth();

  if (isAuthGuardEnabled() && (!isAdmin || !canAccessAdminRole(adminRole, ["owner"]))) {
    return NextResponse.json({ ok: false, message: "Bạn cần quyền owner để sửa KPI Facebook Ads." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as {
    productName?: string;
    kpiLeadsPerDay?: number;
    targetCpl?: number;
  } | null;
  const productName = payload?.productName?.trim() ?? "";

  if (!productName) {
    return NextResponse.json({ ok: false, message: "Thiếu tên sản phẩm để lưu KPI." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, storage: "missing_supabase", message: "Chưa cấu hình Supabase để lưu KPI sản phẩm." },
      { status: 501 },
    );
  }

  const row = {
    product_name: productName,
    kpi_leads_per_day: toNumber(payload?.kpiLeadsPerDay),
    target_cpl: Math.round(toNumber(payload?.targetCpl)),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("product_ads_kpis").upsert(row, { onConflict: "product_name" });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        storage: isMissingSchemaError(error) ? "missing_schema" : "database",
        message: isMissingSchemaError(error)
          ? "Chưa có bảng product_ads_kpis. Hãy chạy SQL cấu hình trước khi lưu KPI."
          : error.message,
      },
      { status: isMissingSchemaError(error) ? 501 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      productName,
      kpiLeadsPerDay: row.kpi_leads_per_day,
      targetCpl: row.target_cpl,
    },
  });
}

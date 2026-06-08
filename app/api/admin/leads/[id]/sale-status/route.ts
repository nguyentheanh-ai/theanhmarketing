import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanText } from "@/lib/security/validation";
import { invalidateAdminModules } from "@/services/adminDataService";
import { logStudentActivity } from "@/services/activityLogService";
import { recordLeadActivity } from "@/services/leadActivityService";
import { leadSaleStatuses, updateLeadSaleStatus, type LeadSaleStatus } from "@/services/leadService";

function isLeadSaleStatus(value: string): value is LeadSaleStatus {
  return leadSaleStatuses.includes(value as LeadSaleStatus);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:leads:sale-status"),
      limit: 120,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền cập nhật sale lead." }, { status: 403 });
      }
    }

    const { id } = await params;
    const body = (await request.json()) as { saleStatus?: string };
    const saleStatus = cleanText(body.saleStatus, 40);

    if (!id || !isLeadSaleStatus(saleStatus)) {
      return NextResponse.json({ ok: false, message: "Trạng thái sale không hợp lệ." }, { status: 400 });
    }

    const result = await updateLeadSaleStatus(id, saleStatus);

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error ?? "Chưa cập nhật được trạng thái sale." }, { status: 500 });
    }

    const updatedLead = "lead" in result && result.lead && typeof result.lead === "object" ? result.lead : null;
    const leadName =
      updatedLead && "name" in updatedLead && typeof updatedLead.name === "string" && updatedLead.name.trim()
        ? updatedLead.name.trim()
        : "khách này";
    const previousSaleStatus = "previousSaleStatus" in result ? result.previousSaleStatus : null;

    await recordLeadActivity({
      leadId: updatedLead && "id" in updatedLead && typeof updatedLead.id === "string" ? updatedLead.id : id,
      activityType: saleStatus.startsWith("Đã liên hệ") ? "customer_contacted" : "sale_status_changed",
      title: `Đã cập nhật trạng thái khách ${leadName} thành ${saleStatus}`,
      description: previousSaleStatus
        ? `Trạng thái sale của ${leadName} đã đổi từ ${previousSaleStatus} sang ${saleStatus}.`
        : `Trạng thái sale của ${leadName} hiện là ${saleStatus}.`,
      oldValue: previousSaleStatus,
      newValue: saleStatus,
      metadata: { requestedLeadId: id, leadName },
    });
    await logStudentActivity({
      leadId: updatedLead && "id" in updatedLead && typeof updatedLead.id === "string" ? updatedLead.id : id,
      studentEmail: updatedLead && "email" in updatedLead && typeof updatedLead.email === "string" ? updatedLead.email : null,
      studentPhone: updatedLead && "phone" in updatedLead && typeof updatedLead.phone === "string" ? updatedLead.phone : null,
      eventType: "sale_status_updated",
      eventTitle: `Đã cập nhật sale status thành ${saleStatus}`,
      eventDescription: previousSaleStatus
        ? `Sale status đổi từ ${previousSaleStatus} sang ${saleStatus}.`
        : `Sale status hiện là ${saleStatus}.`,
      status: "success",
      actorType: "admin",
      metadata: { oldValue: previousSaleStatus, newValue: saleStatus, requestedLeadId: id, leadName },
    });
    invalidateAdminModules(["leads", "activities"]);

    return NextResponse.json({ ok: true, saleStatus, lead: "lead" in result ? result.lead : undefined });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không cập nhật được trạng thái sale." },
      { status: 500 },
    );
  }
}

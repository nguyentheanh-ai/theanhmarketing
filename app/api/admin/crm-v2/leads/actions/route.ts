import { NextResponse } from "next/server";

import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import {
  bulkAddLeadTags,
  bulkAddWorkflowRuns,
  bulkAssignLeadOwner,
  bulkMarkLeadZaloMessaged,
  bulkQueueMarketingEmails,
  bulkUpdateLeadStage,
  exportLeadsCsv,
} from "@/lib/crm-v2/data";
import type { CrmLeadBulkActionPayload, CrmLeadBulkActionResult, CrmStage } from "@/lib/crm-v2/types";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";

type LeadAction = CrmLeadBulkActionPayload["action"];

async function requireOwner() {
  if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
    const { adminRole } = await getCurrentAuth();
    return canAccessAdminRole(adminRole, ["owner"]);
  }

  return true;
}

function sanitizeAction(raw: unknown): LeadAction | null {
  if (typeof raw !== "string") return null;
  const action = raw.trim();
  if (action === "assign_owner") return action;
  if (action === "update_stage") return action;
  if (action === "add_tag") return action;
  if (action === "mark_zalo_messaged") return action;
  if (action === "send_email") return action;
  if (action === "add_workflow") return action;
  if (action === "export_csv") return action;
  return null;
}

function readStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "admin:crm-v2:leads:actions"),
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

  if (!(await requireOwner())) {
    return NextResponse.json({ ok: false, message: "Ban khong co quyen thuc hien lead action." }, { status: 403 });
  }

  if (!isCrmV2Enabled()) {
    return NextResponse.json({ ok: false, disabled: true, message: "CRM_V2_ENABLED=false" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Body payload is invalid." }, { status: 400 });
  }

  const action = sanitizeAction(body.action);
  const leadIds = readStringArray(body.leadIds);
  if (!action || !leadIds.length) {
    return NextResponse.json({ ok: false, message: "Action and leadIds are required." }, { status: 400 });
  }

  let result: CrmLeadBulkActionResult | null = null;

  if (action === "assign_owner") {
    const owner = typeof body.owner === "string" ? body.owner.trim() : "";
    if (!owner) return NextResponse.json({ ok: false, message: "assign_owner requires owner." }, { status: 400 });
    result = await bulkAssignLeadOwner({ action, leadIds, owner, idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined });
  }
  if (action === "update_stage") {
    const stage = typeof body.stage === "string" ? body.stage : "";
    if (!stage) return NextResponse.json({ ok: false, message: "update_stage requires stage." }, { status: 400 });
    result = await bulkUpdateLeadStage({
      action,
      leadIds,
      stage: stage as CrmStage,
      idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
    });
  }
  if (action === "add_tag") {
    const tags = readStringArray(body.tags);
    if (!tags.length) return NextResponse.json({ ok: false, message: "add_tag requires tags." }, { status: 400 });
    result = await bulkAddLeadTags({ action, leadIds, tags, idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined });
  }
  if (action === "mark_zalo_messaged") {
    result = await bulkMarkLeadZaloMessaged({
      action,
      leadIds,
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
      email: typeof body.email === "string" ? body.email.trim() : undefined,
      orderCode: typeof body.orderCode === "string" ? body.orderCode.trim() : undefined,
      idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
    });
  }
  if (action === "send_email") {
    result = await bulkQueueMarketingEmails({
      action,
      leadIds,
      subject: typeof body.subject === "string" ? body.subject.trim() : undefined,
      templateId: typeof body.templateId === "string" ? body.templateId.trim() : undefined,
      idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
    });
  }
  if (action === "export_csv") {
    const payload: CrmLeadBulkActionPayload = {
      action,
      leadIds,
      filename: typeof body.filename === "string" ? body.filename.trim() : undefined,
    };
    const result = await exportLeadsCsv(payload);
    const headers = new Headers();
    headers.set("content-type", "text/csv;charset=utf-8");
    headers.set("content-disposition", `attachment; filename="${result.filename}"`);
    return new NextResponse(result.csv, { status: 200, headers });
  }
  if (action === "add_workflow") {
    const workflowId = typeof body.workflowId === "string" ? body.workflowId.trim() : "";
    if (!workflowId) return NextResponse.json({ ok: false, message: "add_workflow requires workflowId." }, { status: 400 });
    result = await bulkAddWorkflowRuns({
      action,
      leadIds,
      workflowId,
      idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
    });
  }

  if (!result) {
    return NextResponse.json({ ok: false, message: "Action not implemented." }, { status: 400 });
  }

  return NextResponse.json(result);
}

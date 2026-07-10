import { NextResponse } from "next/server";

import { createAdminMember, listAdminMembers, updateAdminMemberRole } from "@/lib/admin/admin-members";
import { getCrmV2MissingLiveConfigMessage, shouldUseCrmV2DemoData } from "@/lib/crm-v2/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCrmV2OwnerRequest } from "../../_shared";

const teamActionValues = new Set(["record_permission_audit", "grant_role", "revoke_role", "add_member", "create_admin_member", "invite_admin_member"]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function POST(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:team:actions");
  if (blocked) return blocked;

  const body = asRecord(await request.json().catch(() => null));
  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!teamActionValues.has(action)) {
    return NextResponse.json({ ok: false, message: "Team action không hợp lệ." }, { status: 400 });
  }

  const member = typeof body.member === "string" && body.member.trim() ? body.member.trim() : "";
  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "sales";
  const memberIdFromBody = typeof body.memberId === "string" && body.memberId.trim() ? body.memberId.trim() : "";
  const client = createSupabaseAdminClient();
  if (shouldUseCrmV2DemoData()) {
    return NextResponse.json({ ok: true, action, mocked: true, message: "record_permission_audit: safe mock mode vì thiếu live CRM v2 schema/env." });
  }
  if (!client) return NextResponse.json({ ok: false, message: getCrmV2MissingLiveConfigMessage("record_permission_audit") }, { status: 503 });
  if (!member) {
    return NextResponse.json({ ok: false, message: "Thiếu member thật để ghi audit phân quyền CRM v2." }, { status: 400 });
  }

  let permissionResult: unknown = null;
  let targetMemberId = memberIdFromBody;
  if (action === "add_member" || action === "create_admin_member" || action === "invite_admin_member") {
    try {
      const created = await createAdminMember({ email: member, role: role === "owner" ? "owner" : "editor" });
      targetMemberId = created.id;
      permissionResult = created;
    } catch (error) {
      return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Không thêm được nhân viên admin." }, { status: 400 });
    }
  }

  if (action === "grant_role" || action === "revoke_role") {
    if (!isUuid(targetMemberId)) {
      const adminMembers = await listAdminMembers({ forceRefresh: true });
      const normalizedMember = member.toLowerCase();
      targetMemberId =
        adminMembers.members.find((item) => item.id === memberIdFromBody || item.email === normalizedMember || item.name.toLowerCase() === normalizedMember)?.id ?? "";
    }
    if (!isUuid(targetMemberId)) {
      return NextResponse.json({ ok: false, message: "Không tìm thấy user admin thật để cấp/thu hồi quyền." }, { status: 400 });
    }
    const nextRole = action === "revoke_role" ? "remove" : role === "owner" ? "owner" : "editor";
    try {
      permissionResult = await updateAdminMemberRole({ userId: targetMemberId, role: nextRole });
    } catch (error) {
      return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Không cập nhật được quyền admin." }, { status: 400 });
    }
  }

  const { data: audit, error } = await client
    .schema("crm_v2")
    .from("audit_logs")
    .insert({
      action,
      entity_table: "crm_v2.team_permissions",
      after_data: {
        member,
        member_id: targetMemberId || null,
        role,
        permission_result: action === "record_permission_audit" ? "audit_only" : "updated",
      },
      metadata: {
        source: "crm-v2-team-ui",
      },
    })
    .select("id,action,entity_table,created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    action,
    audit,
    permissionResult: permissionResult ? { updated: true } : null,
    message: action === "record_permission_audit" ? "record_permission_audit: đã ghi audit phân quyền." : `${action}: đã cập nhật quyền admin CRM v2.`,
  });
}

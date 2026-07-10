"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, FileCheck2, GitBranch, Headphones, Plug, ShieldCheck } from "lucide-react";

import { IconButton } from "./crm-components";
import type { CrmOrderRow, CrmTeamMember } from "@/lib/crm-v2/types";

type ActionButtonState = {
  isPending: boolean;
  status: string;
};

async function postAction(endpoint: string, body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const message = typeof payload?.message === "string" ? payload.message : response.ok ? "ok" : "failed";
  return { ok: response.ok && payload?.ok !== false, message };
}

function useModuleAction() {
  const router = useRouter();
  const [state, setState] = useState<ActionButtonState>({ isPending: false, status: "" });

  async function run(endpoint: string, body: Record<string, unknown>) {
    const action = typeof body.action === "string" ? body.action : "action";
    setState({ isPending: true, status: `${action}: đang gửi...` });
    try {
      const result = await postAction(endpoint, body);
      setState({ isPending: false, status: `${action}: ${result.message}` });
      if (result.ok) router.refresh();
    } catch (error) {
      setState({
        isPending: false,
        status: `${action}: ${error instanceof Error ? error.message : "failed"}`,
      });
    }
  }

  return { ...state, run };
}

function ActionStatus({ status }: { status: string }) {
  if (!status) return null;

  return (
    <span className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700" role="status">
      {status}
    </span>
  );
}

export function SegmentActionPanel() {
  const action = useModuleAction();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton
        disabled={action.isPending}
        label="Lưu segment"
        onClick={() =>
          void action.run("/api/admin/crm-v2/segments/actions", {
            action: "save_segment",
            name: "VIP remarketing",
            rules: {
              combinator: "and",
              conditions: [{ field: "lead_score", operator: "gte", value: 60 }],
            },
          })
        }
      >
        <FileCheck2 className="h-4 w-4" />
      </IconButton>
      <ActionStatus status={action.status} />
    </div>
  );
}

export function OrderActionButtons({ order }: { order?: Pick<CrmOrderRow, "id" | "orderCode"> }) {
  const action = useModuleAction();
  const orderId = order?.id ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton
        disabled={action.isPending || !orderId}
        label="Gửi nhắc thanh toán"
        onClick={() =>
          void action.run("/api/admin/crm-v2/orders/actions", {
            action: "send_payment_reminder",
            orderId,
          })
        }
      >
        <Bell className="h-4 w-4" />
      </IconButton>
      <ActionStatus status={action.status} />
    </div>
  );
}

export function StudentActionButtons({ contactId }: { contactId?: string }) {
  const action = useModuleAction();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton
        disabled={action.isPending || !contactId}
        label="Tạo ticket CSKH"
        onClick={() =>
          void action.run("/api/admin/crm-v2/students/actions", {
            action: "create_support_ticket",
            contactId,
            subject: "CRM v2 student success follow-up",
          })
        }
      >
        <Headphones className="h-4 w-4" />
      </IconButton>
      <ActionStatus status={action.status} />
    </div>
  );
}

export function TeamActionButtons({ member }: { member?: Pick<CrmTeamMember, "id" | "member" | "role"> }) {
  const action = useModuleAction();
  const memberId = member?.id ?? "";
  const memberName = member?.member ?? "";
  const role = member?.role ?? "sales";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton
        disabled={action.isPending || !memberId}
        label="Cấp quyền editor"
        onClick={() =>
          void action.run("/api/admin/crm-v2/team/actions", {
            action: "grant_role",
            memberId,
            member: memberName,
            role: "editor",
          })
        }
      >
        <ShieldCheck className="h-4 w-4" />
      </IconButton>
      <IconButton
        disabled={action.isPending || !memberId}
        label="Thu hồi quyền"
        onClick={() =>
          void action.run("/api/admin/crm-v2/team/actions", {
            action: "revoke_role",
            memberId,
            member: memberName,
            role,
          })
        }
      >
        <ShieldCheck className="h-4 w-4" />
      </IconButton>
      <IconButton
        disabled={action.isPending || !memberName}
        label="Ghi audit quyền"
        onClick={() =>
          void action.run("/api/admin/crm-v2/team/actions", {
            action: "record_permission_audit",
            member: memberName,
            role,
          })
        }
      >
        <ShieldCheck className="h-4 w-4" />
      </IconButton>
      <ActionStatus status={action.status} />
    </div>
  );
}

export function IntegrationActionButtons({ provider = "resend" }: { provider?: string }) {
  const action = useModuleAction();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton
        disabled={action.isPending}
        label="Kiểm tra kết nối"
        onClick={() =>
          void action.run("/api/admin/crm-v2/integrations/actions", {
            action: "test_connection",
            provider,
          })
        }
      >
        <Plug className="h-4 w-4" />
      </IconButton>
      <IconButton href="/admin/crm-v2/automation" label="Mở workflow xử lý lỗi">
        <GitBranch className="h-4 w-4" />
      </IconButton>
      <ActionStatus status={action.status} />
    </div>
  );
}

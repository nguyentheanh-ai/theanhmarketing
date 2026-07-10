"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot } from "lucide-react";
import { IconButton } from "./crm-components";

type WorkflowAction = "test_workflow" | "save_draft" | "publish" | "version_history";

type WorkflowActionButtonsProps = {
  edges?: Array<Record<string, unknown>>;
  nodes?: Array<Record<string, unknown>>;
  onWorkflowSaved?: (workflowId: string) => void;
  workflowId?: string;
  workflowName?: string;
};

function statusText(action: WorkflowAction, payload: Record<string, unknown>) {
  const message = typeof payload.message === "string" ? payload.message : "";
  if (payload.ok) return `${action}: ${message || "ok"}`;
  return `${action}: ${message || "failed"}`;
}

export function WorkflowActionButtons({ edges = [], nodes = [], onWorkflowSaved, workflowId, workflowName }: WorkflowActionButtonsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<WorkflowAction | null>(null);
  const [status, setStatus] = useState("");
  const [versions, setVersions] = useState<Array<Record<string, unknown>>>([]);

  async function runAction(action: WorkflowAction) {
    setPendingAction(action);
    setStatus(`${action}: đang gửi...`);
    try {
      const response = await fetch("/api/admin/crm-v2/automation/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          workflowId,
          name: workflowName || "CRM v2 workflow draft",
          nodes,
          edges,
        }),
      });
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!payload) {
        setStatus(`${action}: không đọc được phản hồi API`);
        return;
      }
      setStatus(statusText(action, payload));
      if (Array.isArray(payload.versions)) setVersions(payload.versions as Array<Record<string, unknown>>);
      if (typeof payload.workflowId === "string") onWorkflowSaved?.(payload.workflowId);
      if (response.ok && payload.ok && (action === "save_draft" || action === "publish")) router.refresh();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton disabled={pendingAction !== null} label="Test workflow" onClick={() => void runAction("test_workflow")}>
        <Bot className="h-4 w-4" />
      </IconButton>
      <IconButton disabled={pendingAction !== null} label="Lưu nháp" onClick={() => void runAction("save_draft")}>
        <Bot className="h-4 w-4" />
      </IconButton>
      <IconButton disabled={pendingAction !== null} label="Publish" onClick={() => void runAction("publish")}>
        <Bot className="h-4 w-4" />
      </IconButton>
      <IconButton disabled={pendingAction !== null} label="Lịch sử" onClick={() => void runAction("version_history")}>
        <Bot className="h-4 w-4" />
      </IconButton>
      {status ? (
        <span className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700" role="status">
          {status}
        </span>
      ) : null}
      {versions.length ? (
        <div className="basis-full rounded-lg border border-slate-200 bg-white p-3" role="list">
          {versions.slice(0, 5).map((version) => (
            <div key={String(version.id ?? version.version)} className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600" role="listitem">
              <span>v{String(version.version ?? "-")}</span>
              <span>{String(version.status ?? "draft")}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

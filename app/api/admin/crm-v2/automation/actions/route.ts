import { NextResponse } from "next/server";

import { getCrmV2MissingLiveConfigMessage, shouldUseCrmV2DemoData } from "@/lib/crm-v2/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildWorkflowDefinitionRecords } from "@/lib/crm-v2/workflow-runner";
import { evaluateWorkflowStep } from "@/lib/crm-v2/workflows";
import { requireCrmV2OwnerRequest } from "../../_shared";

const workflowActionValues = new Set(["test_workflow", "save_draft", "publish", "version_history"]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
}

export async function POST(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:automation:actions");
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action.trim() : "";
  if (!workflowActionValues.has(action)) {
    return NextResponse.json({ ok: false, message: "Automation action không hợp lệ." }, { status: 400 });
  }

  if (action === "test_workflow") {
    const nodes = asArray(body?.nodes);
    const stepResults = nodes.map((node) => ({
      nodeKey: String(node.id ?? node.node_key ?? "node"),
      ...evaluateWorkflowStep({ type: String(node.type ?? node.node_type ?? "condition"), config: asRecord(node.config ?? node.data) }),
    }));
    return NextResponse.json({ ok: true, action, stepResults, message: "Workflow test đã chạy ở chế độ đánh giá, không chạy automation dài trong browser." });
  }

  const client = createSupabaseAdminClient();
  if (shouldUseCrmV2DemoData()) {
    return NextResponse.json({ ok: true, action, mocked: true, versions: [], message: "Thiếu live CRM v2 schema/env, action chạy mock mode an toàn." });
  }
  if (!client) return NextResponse.json({ ok: false, message: getCrmV2MissingLiveConfigMessage("automation_action") }, { status: 503 });

  if (action === "version_history") {
    const workflowId = typeof body?.workflowId === "string" ? body.workflowId.trim() : "";
    if (!isUuid(workflowId)) return NextResponse.json({ ok: false, message: "workflowId không hợp lệ." }, { status: 400 });
    const { data, error } = await client
      .schema("crm_v2")
      .from("workflow_versions")
      .select("id,version,status,published_at,created_at")
      .eq("workflow_id", workflowId)
      .order("version", { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action, versions: data ?? [] });
  }

  if (action === "save_draft") {
    const workflowId = typeof body?.workflowId === "string" ? body.workflowId.trim() : "";
    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "CRM v2 workflow draft";
    const nodes = asArray(body?.nodes);
    const edges = asArray(body?.edges);
    const workflowResult = isUuid(workflowId)
      ? await client.schema("crm_v2").from("workflows").update({ name, status: "draft", updated_at: new Date().toISOString() }).eq("id", workflowId).select("id").single()
      : await client.schema("crm_v2").from("workflows").insert({ name, status: "draft" }).select("id").single();

    if (workflowResult.error || !workflowResult.data?.id) {
      return NextResponse.json({ ok: false, message: workflowResult.error?.message ?? "Không lưu được workflow." }, { status: 500 });
    }

    const targetWorkflowId = String(workflowResult.data.id);
    const latestVersion = await client.schema("crm_v2").from("workflow_versions").select("version").eq("workflow_id", targetWorkflowId).order("version", { ascending: false }).limit(1).maybeSingle();
    const nextVersion = Number(latestVersion.data?.version ?? 0) + 1;
    const versionResult = await client.schema("crm_v2").from("workflow_versions").insert({ workflow_id: targetWorkflowId, version: nextVersion, status: "draft", nodes, edges }).select("id,version,status").single();

    if (versionResult.error) return NextResponse.json({ ok: false, message: versionResult.error.message }, { status: 500 });
    const { nodeRows, edgeRows } = buildWorkflowDefinitionRecords({ workflowVersionId: String(versionResult.data.id), nodes, edges });
    if (nodeRows.length) {
      const nodeResult = await client.schema("crm_v2").from("workflow_nodes").insert(nodeRows);
      if (nodeResult.error) return NextResponse.json({ ok: false, message: nodeResult.error.message }, { status: 500 });
    }
    if (edgeRows.length) {
      const edgeResult = await client.schema("crm_v2").from("workflow_edges").insert(edgeRows);
      if (edgeResult.error) return NextResponse.json({ ok: false, message: edgeResult.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action, workflowId: targetWorkflowId, version: versionResult.data, message: "Đã lưu nháp workflow." });
  }

  const workflowId = typeof body?.workflowId === "string" ? body.workflowId.trim() : "";
  if (!isUuid(workflowId)) return NextResponse.json({ ok: false, message: "workflowId không hợp lệ." }, { status: 400 });

  const { data: version, error: versionError } = await client
    .schema("crm_v2")
    .from("workflow_versions")
    .select("id,version,status")
    .eq("workflow_id", workflowId)
    .eq("status", "draft")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError || !version?.id) {
    return NextResponse.json({ ok: false, message: versionError?.message ?? "Workflow chưa có version để publish." }, { status: 400 });
  }

  const publishedAt = new Date().toISOString();
  const versionUpdate = await client.schema("crm_v2").from("workflow_versions").update({ status: "published", published_at: publishedAt }).eq("id", version.id).eq("status", "draft");
  if (versionUpdate.error) return NextResponse.json({ ok: false, message: versionUpdate.error.message }, { status: 500 });

  const workflowUpdate = await client.schema("crm_v2").from("workflows").update({ status: "active", active_version_id: version.id, updated_at: publishedAt }).eq("id", workflowId);
  if (workflowUpdate.error) return NextResponse.json({ ok: false, message: workflowUpdate.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, action, workflowId, versionId: version.id, message: "Đã publish workflow immutable version." });
}

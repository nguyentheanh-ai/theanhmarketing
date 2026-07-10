"use client";

import { addEdge, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { WorkflowActionButtons } from "./workflow-action-buttons";
import { WorkflowCanvas } from "./workflow-canvas";

type WorkflowBuilderProps = {
  workflowId?: string;
  workflowName?: string;
};

type PaletteNode = {
  label: string;
  nodeType: string;
  defaults: Record<string, string>;
};

type WorkflowRecipe = {
  id: string;
  label: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
};

const nodePalette: PaletteNode[] = [
  { label: "Trigger Form", nodeType: "trigger_form", defaults: { form: "course_interest" } },
  { label: "Trigger Event", nodeType: "trigger_event", defaults: { event: "course_page_view" } },
  { label: "Trigger Tag", nodeType: "trigger_tag", defaults: { tag: "warm" } },
  { label: "Condition", nodeType: "condition", defaults: { field: "lead_score", operator: "gte", value: "50" } },
  { label: "Split", nodeType: "split", defaults: { mode: "50_50" } },
  { label: "Send Email", nodeType: "send_email", defaults: { templateId: "pending-payment-rescue" } },
  { label: "Add Tag", nodeType: "add_tag", defaults: { tag: "high-intent" } },
  { label: "Remove Tag", nodeType: "remove_tag", defaults: { tag: "cold" } },
  { label: "Update Stage", nodeType: "update_stage", defaults: { stage: "pending_payment" } },
  { label: "Notify Internal", nodeType: "notify_internal", defaults: { channel: "sales" } },
  { label: "Webhook", nodeType: "webhook", defaults: { url: "https://example.com/webhook" } },
  { label: "Delay", nodeType: "delay", defaults: { minutes: "1440", unit: "minutes" } },
  { label: "Wait Until", nodeType: "wait_until", defaults: { time: "09:00" } },
  { label: "Goal", nodeType: "goal", defaults: { event: "purchase" } },
];

const initialNodes: Node[] = [
  { id: "trigger_form", type: "input", position: { x: 40, y: 140 }, data: { label: "Trigger Form", nodeType: "trigger_form", form: "course_interest" } },
  { id: "condition_score", position: { x: 300, y: 140 }, data: { label: "Condition", nodeType: "condition", field: "lead_score", operator: "gte", value: "50" } },
  { id: "send_email", position: { x: 560, y: 80 }, data: { label: "Send Email", nodeType: "send_email", templateId: "pending-payment-rescue" } },
  { id: "delay", position: { x: 560, y: 210 }, data: { label: "Delay", nodeType: "delay", minutes: "1440", unit: "minutes" } },
  { id: "goal_paid", type: "output", position: { x: 820, y: 140 }, data: { label: "Goal", nodeType: "goal", event: "purchase" } },
];

const initialEdges: Edge[] = [
  { id: "edge_trigger_condition", source: "trigger_form", target: "condition_score" },
  { id: "edge_condition_email", source: "condition_score", target: "send_email", label: "yes", data: { branch: "yes" } },
  { id: "edge_condition_delay", source: "condition_score", target: "delay", label: "no", data: { branch: "no" } },
  { id: "edge_email_goal", source: "send_email", target: "goal_paid" },
  { id: "edge_delay_email", source: "delay", target: "send_email" },
];

const workflowRecipes: WorkflowRecipe[] = [
  {
    id: "payment_reminder_recipe",
    label: "Nhắc thanh toán 48h",
    description: "Khi đơn chờ thanh toán, đợi 48h, gửi email nhắc và dừng khi paid.",
    nodes: [
      { id: "trigger_pending_payment", type: "input", position: { x: 40, y: 140 }, data: { label: "Trigger Event", nodeType: "trigger_event", event: "order.pending_payment" } },
      { id: "delay_48h", position: { x: 300, y: 140 }, data: { label: "Delay", nodeType: "delay", minutes: "2880", unit: "minutes" } },
      { id: "send_payment_email", position: { x: 560, y: 140 }, data: { label: "Send Email", nodeType: "send_email", templateId: "pending-payment-reminder" } },
      { id: "goal_purchase", type: "output", position: { x: 820, y: 140 }, data: { label: "Goal", nodeType: "goal", event: "purchase" } },
    ],
    edges: [
      { id: "edge_payment_delay", source: "trigger_pending_payment", target: "delay_48h" },
      { id: "edge_delay_payment_email", source: "delay_48h", target: "send_payment_email" },
      { id: "edge_payment_email_goal", source: "send_payment_email", target: "goal_purchase" },
    ],
  },
  {
    id: "lead_welcome_recipe",
    label: "Lead mới -> 3 email",
    description: "Khi khách điền form, tag warm, gửi email chào và báo sale nếu score cao.",
    nodes: initialNodes,
    edges: initialEdges,
  },
];

export function WorkflowRecipePanel({ onApplyRecipe }: { onApplyRecipe?: (recipeId: string) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Công thức vận hành</div>
      <div className="mb-3 grid gap-2 text-xs font-bold leading-5 text-slate-700 lg:grid-cols-4">
        <div className="rounded-lg bg-blue-50 p-2"><span className="font-black text-blue-700">Trigger</span>: khách đăng ký, chưa thanh toán, đã thanh toán hoặc inactive.</div>
        <div className="rounded-lg bg-orange-50 p-2"><span className="font-black text-orange-700">Điều kiện</span>: đúng khóa học, đúng trạng thái, không suppression, không gửi trùng.</div>
        <div className="rounded-lg bg-emerald-50 p-2"><span className="font-black text-emerald-700">Hành động</span>: gửi email, thêm tag, cập nhật stage, báo sale/CSKH.</div>
        <div className="rounded-lg bg-violet-50 p-2"><span className="font-black text-violet-700">Log</span>: workflow_runs, workflow_step_runs, email_sends, crm_events.</div>
      </div>
      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-600">
        Gợi ý: Khách đăng ký -&gt; gửi mail thanh toán · Chưa thanh toán -&gt; nhắc · Đã thanh toán -&gt; gửi thông tin học · Inactive -&gt; chăm sóc.
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {workflowRecipes.map((recipe) => (
          <button
            key={recipe.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            data-crm-action="button"
            disabled={!onApplyRecipe}
            onClick={() => onApplyRecipe?.(recipe.id)}
            type="button"
          >
            <div className="text-sm font-black text-slate-900">{recipe.label}</div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">{recipe.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function serializeNode(node: Node) {
  const data = (node.data ?? {}) as Record<string, unknown>;
  return {
    id: node.id,
    type: String(data.nodeType ?? node.type ?? "condition"),
    position: node.position,
    data,
  };
}

function serializeEdge(edge: Edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: typeof edge.label === "string" ? edge.label : undefined,
    data: edge.data ?? {},
  };
}

export function WorkflowBuilder({ workflowId, workflowName }: WorkflowBuilderProps) {
  const [activeWorkflowId, setActiveWorkflowId] = useState(workflowId);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(initialNodes[0]?.id ?? "");
  const edgeCounter = useRef(0);
  const nodeCounter = useRef(0);
  const workflowHistoryAction = "version_history";

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);
  const selectedData = (selectedNode?.data ?? {}) as Record<string, unknown>;
  const selectedKeys = Object.keys(selectedData).filter((key) => key !== "label" && key !== "nodeType");

  const onConnect = useCallback(
    (connection: Connection) => {
      edgeCounter.current += 1;
      setEdges((currentEdges) =>
        addEdge({ ...connection, id: `edge_${connection.source}_${connection.target}_${edgeCounter.current}` }, currentEdges),
      );
    },
    [setEdges],
  );

  function addPaletteNode(item: PaletteNode) {
    nodeCounter.current += 1;
    const id = `${item.nodeType}_${nodeCounter.current}`;
    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id,
        position: { x: 160 + currentNodes.length * 24, y: 120 + currentNodes.length * 18 },
        data: { label: item.label, nodeType: item.nodeType, ...item.defaults },
      },
    ]);
    setSelectedNodeId(id);
  }

  function applyRecipe(recipeId: string) {
    const recipe = workflowRecipes.find((item) => item.id === recipeId);
    if (!recipe) return;
    setNodes(recipe.nodes.map((node) => ({ ...node, data: { ...(node.data as Record<string, unknown>) } })));
    setEdges(recipe.edges.map((edge) => ({ ...edge, data: edge.data ? { ...(edge.data as Record<string, unknown>) } : undefined })));
    setSelectedNodeId(recipe.nodes[0]?.id ?? "");
  }

  function removeSelectedNode() {
    if (!selectedNodeId) return;
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId));
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId("");
  }

  function updateSelectedNodeField(key: string, value: string) {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...(node.data as Record<string, unknown>), [key]: value } }
          : node,
      ),
    );
  }

  return (
    <div className="space-y-4" data-version-action={workflowHistoryAction}>
      <WorkflowRecipePanel onApplyRecipe={applyRecipe} />
      <WorkflowActionButtons
        edges={edges.map(serializeEdge)}
        nodes={nodes.map(serializeNode)}
        onWorkflowSaved={setActiveWorkflowId}
        workflowId={activeWorkflowId}
        workflowName={workflowName}
      />
      <div className="grid gap-4 2xl:grid-cols-[220px_1fr_280px]">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Node palette</div>
          <div className="grid gap-2">
            {nodePalette.map((item) => (
              <button
                key={item.nodeType}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-xs font-bold text-slate-700 hover:bg-blue-50"
                data-crm-action="button"
                onClick={() => addPaletteNode(item)}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <WorkflowCanvas
          edges={edges}
          nodes={nodes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodeClick={setSelectedNodeId}
          onNodesChange={onNodesChange}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Node config</div>
              <div className="mt-1 text-sm font-black text-slate-900">{String(selectedData.label ?? "Select node")}</div>
            </div>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 disabled:opacity-40"
              data-crm-action="button"
              disabled={!selectedNode}
              onClick={removeSelectedNode}
              title="Remove node"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {selectedNode ? (
            <div className="space-y-3">
              {selectedKeys.map((key) => (
                <label key={key} className="block text-xs font-bold text-slate-600">
                  {key}
                  <input
                    className="mt-1 min-h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
                    onChange={(event) => updateSelectedNodeField(key, event.target.value)}
                    value={String(selectedData[key] ?? "")}
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              Chọn node trên canvas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

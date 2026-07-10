import { evaluateWorkflowStep, makeWorkflowStepIdempotencyKey } from "./workflows";

type CanvasRecord = Record<string, unknown>;

type WorkflowDefinitionInput = {
  workflowVersionId: string;
  nodes: CanvasRecord[];
  edges: CanvasRecord[];
};

type WorkflowStepInput = {
  workflowRunId: string;
  nodes: CanvasRecord[];
  attempt?: number;
  now?: Date;
};

type WorkflowStepRunRow = {
  workflow_run_id: string;
  node_key: string;
  status: "pending" | "waiting" | "success" | "skipped";
  idempotency_key: string;
  started_at: string;
  waiting_until: string | null;
  finished_at: string | null;
  error_message: string | null;
  metadata: CanvasRecord;
};

type WorkflowTableClient = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: CanvasRecord | null; error: { message: string } | null }>;
    };
  };
  upsert: (
    rows: WorkflowStepRunRow[],
    options: { ignoreDuplicates: boolean; onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
};

type WorkflowSchemaClient = {
  from: (table: string) => WorkflowTableClient;
};

function crmV2Schema(client: unknown): WorkflowSchemaClient {
  return (client as { schema: (schema: string) => WorkflowSchemaClient }).schema("crm_v2");
}

type WorkflowSupabaseClient = unknown;

function asRecord(value: unknown): CanvasRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as CanvasRecord) : {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nodeKey(node: CanvasRecord) {
  return stringValue(node.id ?? node.node_key, "node");
}

function nodeType(node: CanvasRecord) {
  const data = asRecord(node.data);
  return stringValue(node.node_type ?? data.nodeType ?? node.type, "condition");
}

function nodeConfig(node: CanvasRecord) {
  const data = asRecord(node.data);
  const config = asRecord(node.config);
  return Object.keys(config).length ? config : data;
}

function nodePosition(node: CanvasRecord) {
  return asRecord(node.position);
}

function edgeKey(edge: CanvasRecord) {
  return stringValue(edge.id ?? edge.edge_key, "edge");
}

export function buildWorkflowDefinitionRecords(input: WorkflowDefinitionInput) {
  const nodeRows = input.nodes.map((node) => ({
    workflow_version_id: input.workflowVersionId,
    node_key: nodeKey(node),
    node_type: nodeType(node),
    config: nodeConfig(node),
    position: nodePosition(node),
  }));

  const edgeRows = input.edges.map((edge) => ({
    workflow_version_id: input.workflowVersionId,
    edge_key: edgeKey(edge),
    source_node_key: stringValue(edge.source ?? edge.source_node_key, "source"),
    target_node_key: stringValue(edge.target ?? edge.target_node_key, "target"),
    condition: {
      ...asRecord(edge.data),
      ...asRecord(edge.condition),
      ...(typeof edge.label === "string" && edge.label.trim() ? { label: edge.label.trim() } : {}),
    },
  }));

  return { nodeRows, edgeRows };
}

export function buildWorkflowStepRunRecords(input: WorkflowStepInput): WorkflowStepRunRow[] {
  const now = input.now ?? new Date();
  const attempt = input.attempt ?? 1;

  return input.nodes.map((node) => {
    const key = nodeKey(node);
    const evaluation = evaluateWorkflowStep({ type: nodeType(node), config: nodeConfig(node) });
    const waitingUntil =
      evaluation.status === "waiting" && evaluation.waitMs > 0
        ? new Date(now.getTime() + evaluation.waitMs).toISOString()
        : null;

    return {
      workflow_run_id: input.workflowRunId,
      node_key: key,
      status: evaluation.status,
      idempotency_key: makeWorkflowStepIdempotencyKey({ workflowRunId: input.workflowRunId, nodeKey: key, attempt }),
      started_at: now.toISOString(),
      waiting_until: waitingUntil,
      finished_at: evaluation.status === "success" || evaluation.status === "skipped" ? now.toISOString() : null,
      error_message: null,
      metadata: evaluation,
    };
  });
}

export async function createWorkflowStepRunsForRun(input: {
  attempt?: number;
  client: WorkflowSupabaseClient;
  now?: Date;
  workflowRunId: string;
  workflowVersionId: string;
}) {
  const schema = crmV2Schema(input.client);
  const versionResult = await schema
    .from("workflow_versions")
    .select("id,nodes")
    .eq("id", input.workflowVersionId)
    .maybeSingle();

  if (versionResult.error || !versionResult.data) {
    return { ok: false, inserted: 0, message: versionResult.error?.message ?? "workflow version not found" };
  }

  const nodes = Array.isArray(versionResult.data.nodes) ? (versionResult.data.nodes as CanvasRecord[]) : [];
  const rows = buildWorkflowStepRunRecords({
    attempt: input.attempt,
    nodes,
    now: input.now,
    workflowRunId: input.workflowRunId,
  });

  if (!rows.length) {
    return { ok: true, inserted: 0, message: "workflow version has no nodes" };
  }

  const writeResult = await schema
    .from("workflow_step_runs")
    .upsert(rows, { ignoreDuplicates: true, onConflict: "idempotency_key" });

  if (writeResult.error) {
    return { ok: false, inserted: 0, message: writeResult.error.message };
  }

  return { ok: true, inserted: rows.length, message: "workflow step runs prepared" };
}

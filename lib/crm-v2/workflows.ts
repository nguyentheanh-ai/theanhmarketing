import type { WorkflowNodeDefinition, WorkflowStepEvaluation } from "./types";

const WAIT_UNITS_IN_MS: Record<string, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

export const WORKFLOW_STEP_STATUSES = ["pending", "running", "waiting", "success", "failed", "skipped"] as const;

export function evaluateWorkflowStep(node: WorkflowNodeDefinition): WorkflowStepEvaluation {
  if (node.type === "delay") {
    const minutes = Number(node.config?.minutes ?? 0);
    const unit = String(node.config?.unit ?? "minutes");
    return { status: "waiting", waitMs: minutes * (WAIT_UNITS_IN_MS[unit] ?? WAIT_UNITS_IN_MS.minutes) };
  }

  if (node.type === "wait_until") {
    return { status: "waiting", waitMs: 0 };
  }

  if (node.type === "send_email") {
    return { status: "pending", action: "enqueue_email" };
  }

  if (node.type === "webhook") {
    return { status: "pending", action: "enqueue_webhook" };
  }

  if (["add_tag", "remove_tag", "update_stage", "notify_internal"].includes(node.type)) {
    return { status: "pending", action: node.type };
  }

  if (node.type === "condition") {
    return { status: "success", action: "condition_evaluated" };
  }

  if (node.type === "split") {
    return { status: "success", action: "split_evaluated" };
  }

  if (node.type === "goal") {
    return { status: "success", action: "goal_checked" };
  }

  if (node.type.startsWith("trigger_")) {
    return { status: "success", action: "trigger_matched" };
  }

  return { status: "skipped", reason: "unsupported_node_type" };
}

export function makeWorkflowStepIdempotencyKey(input: { workflowRunId: string; nodeKey: string; attempt?: number }) {
  return [input.workflowRunId, input.nodeKey, input.attempt ?? 1].join(":");
}

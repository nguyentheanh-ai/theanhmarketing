import type { PriorityTask, SoloCommandCenterModel } from "@/lib/admin/solo-command-center";

export type PrioritySeverityFilter = "all" | PriorityTask["severity"];

const severityFilters = new Set<PrioritySeverityFilter>(["all", "critical", "warning", "info"]);

type QueueDataStatus = Pick<SoloCommandCenterModel["dataStatus"], "orders" | "students" | "activities">;

export function getPriorityQueueAvailability(status: QueueDataStatus, taskCount: number) {
  if ([status.orders, status.students, status.activities].includes("error")) return "error" as const;
  return taskCount === 0 ? "empty" as const : "ready" as const;
}

export function filterPriorityQueue<T extends Pick<PriorityTask, "id" | "severity">>(
  tasks: T[],
  requestedSeverity?: string,
  requestedTaskId?: string,
) {
  const severity: PrioritySeverityFilter = severityFilters.has(requestedSeverity as PrioritySeverityFilter)
    ? requestedSeverity as PrioritySeverityFilter
    : "all";
  const visibleTasks = severity === "all"
    ? tasks
    : tasks.filter((task) => task.severity === severity);
  const selectedTaskId = requestedTaskId && visibleTasks.some((task) => task.id === requestedTaskId)
    ? requestedTaskId
    : undefined;

  return { severity, tasks: visibleTasks, selectedTaskId };
}

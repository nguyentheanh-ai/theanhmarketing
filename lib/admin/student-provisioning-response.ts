import type { ProvisioningOperation } from "@/services/studentProvisioningOperationService";

export function toPublicProvisioningResult(operation: ProvisioningOperation) {
  const { student, order, access, email, nextActions = [] } = operation.safeResult;
  if (!student || !order || !access || !email) return null;
  return {
    ok: operation.status === "completed",
    operationId: operation.operationId,
    mode: operation.mode,
    student,
    order,
    access: { ...access, courseSlugs: access.courseSlugs ?? [] },
    email,
    nextActions,
  };
}

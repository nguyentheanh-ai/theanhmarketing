import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import { ProvisioningOperationLostLeaseError } from "@/services/studentProvisioningOperationService";

export class StudentProvisioningControlError extends Error {
  readonly code = "PROVISIONING_CONTROL_FAILED" as const;
  constructor() { super("PROVISIONING_CONTROL_FAILED"); this.name = "StudentProvisioningControlError"; }
}

export class StudentProvisioningOwnerRequiredError extends Error {
  readonly code = "PROVISIONING_OWNER_REQUIRED" as const;
  constructor() { super("PROVISIONING_OWNER_REQUIRED"); this.name = "StudentProvisioningOwnerRequiredError"; }
}

function client() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new StudentProvisioningControlError();
  const value = createSupabaseAdminClient();
  if (!value) throw new StudentProvisioningControlError();
  return value;
}

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StudentProvisioningControlError();
  return value as Record<string, unknown>;
}

async function rpc(name: string, args: Record<string, unknown>) {
  let result: unknown;
  try { result = await client().rpc(name, args); } catch { throw new StudentProvisioningControlError(); }
  const row = object(result);
  if (row.error || !("data" in row)) throw new StudentProvisioningControlError();
  return object(row.data);
}

export async function beginProvisioningEmailDispatch(input: {
  operationId: string; leaseToken: string;
}): Promise<{ state: "send" | "sent" | "manual_review"; idempotencyKey?: string; attempt?: number; providerMessageId?: string }> {
  const row = await rpc("begin_admin_student_provisioning_email_dispatch", {
    p_operation_id: input.operationId, p_lease_token: input.leaseToken,
  });
  if (row.dispatch_state === "lost_lease") throw new ProvisioningOperationLostLeaseError();
  if (!["send", "sent", "manual_review"].includes(String(row.dispatch_state))) throw new StudentProvisioningControlError();
  if (row.provider_message_id !== undefined && row.provider_message_id !== null && typeof row.provider_message_id !== "string") {
    throw new StudentProvisioningControlError();
  }
  if (row.dispatch_state === "send" && (typeof row.idempotency_key !== "string" || !Number.isInteger(row.attempt))) {
    throw new StudentProvisioningControlError();
  }
  return {
    state: row.dispatch_state as "send" | "sent" | "manual_review",
    ...(typeof row.provider_message_id === "string" ? { providerMessageId: row.provider_message_id } : {}),
    ...(typeof row.idempotency_key === "string" ? { idempotencyKey: row.idempotency_key } : {}),
    ...(typeof row.attempt === "number" ? { attempt: row.attempt } : {}),
  };
}

export async function finishProvisioningEmailDispatch(input: {
  operationId: string; leaseToken: string; state: "sent" | "manual_review" | "retryable"; providerMessageId?: string | null;
}) {
  const row = await rpc("finish_admin_student_provisioning_email_dispatch", {
    p_operation_id: input.operationId, p_lease_token: input.leaseToken, p_state: input.state,
    p_provider_message_id: input.providerMessageId ?? null,
  });
  if (row.dispatch_state === "lost_lease") throw new ProvisioningOperationLostLeaseError();
  if (row.dispatch_state !== input.state && row.dispatch_state !== "manual_review") throw new StudentProvisioningControlError();
  return { state: row.dispatch_state as "sent" | "manual_review" | "retryable" };
}

export async function resolveProvisioningEmailReview(input: {
  operationId: string;
  resolution: "confirm_delivered" | "confirm_not_delivered";
}) {
  const { user, adminRole } = await getCurrentAuth();
  if (!user || !canAccessAdminRole(adminRole, ["owner"])) throw new StudentProvisioningOwnerRequiredError();
  const row = await rpc("resolve_admin_student_provisioning_email_review", {
    p_operation_id: input.operationId, p_owner_id: user.id, p_resolution: input.resolution,
  });
  if (!["sent", "retry_authorized", "not_reviewable"].includes(String(row.resolution_state))) {
    throw new StudentProvisioningControlError();
  }
  return { state: row.resolution_state as "sent" | "retry_authorized" | "not_reviewable" };
}

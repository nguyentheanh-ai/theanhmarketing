import { createHash, randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProvisioningMode = "paid" | "free" | "trial";
export type ProvisioningOperationStatus = "running" | "partial" | "completed" | "failed";
export type ProvisioningStep =
  | "validate"
  | "resolve_student"
  | "create_order"
  | "ensure_account"
  | "grant_access"
  | "send_email"
  | "complete";
export type StepState = "created" | "existing" | "granted" | "sent" | "skipped" | "failed" | "not_applicable";
export type StudentProvisioningState = Extract<StepState, "created" | "existing" | "skipped" | "failed" | "not_applicable">;
export type OrderProvisioningState = Extract<StepState, "created" | "existing" | "skipped" | "failed" | "not_applicable">;
export type AccessProvisioningState = Extract<StepState, "existing" | "granted" | "skipped" | "failed" | "not_applicable">;
export type EmailProvisioningState = Extract<StepState, "sent" | "skipped" | "failed" | "not_applicable">;
export type ProvisioningNextAction = "retry_access" | "retry_email";
export type ProvisioningErrorCode =
  | "VALIDATION_FAILED"
  | "STUDENT_RESOLUTION_FAILED"
  | "ORDER_CREATION_FAILED"
  | "ACCOUNT_SETUP_FAILED"
  | "ACCESS_GRANT_FAILED"
  | "EMAIL_SEND_FAILED"
  | "OPERATION_FAILED";

export type SafeProvisioningResult = {
  student?: { state: StudentProvisioningState };
  order?: { state: OrderProvisioningState; orderCode?: string };
  access?: { state: AccessProvisioningState; courseSlugs?: string[] };
  email?: { state: EmailProvisioningState };
  nextActions?: ProvisioningNextAction[];
  errorCode?: ProvisioningErrorCode;
};

export type ProvisioningOperation = {
  id: string;
  operationId: string;
  requestFingerprint: string;
  mode: ProvisioningMode;
  status: ProvisioningOperationStatus;
  currentStep: ProvisioningStep;
  orderCode: string | null;
  safeResult: SafeProvisioningResult;
  actorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProvisioningRequestFingerprintInput = {
  mode: ProvisioningMode;
  email: string;
  phone: string;
  courseSlugs: string[];
  trialExpiresAt?: string | null;
  sendEmail: boolean;
};

type ServiceErrorCode =
  | "PROVISIONING_CLIENT_UNAVAILABLE"
  | "PROVISIONING_QUERY_FAILED"
  | "PROVISIONING_INVALID_INPUT"
  | "PROVISIONING_INVALID_ROW";

export class ProvisioningOperationServiceError extends Error {
  readonly code: ServiceErrorCode;

  constructor(code: ServiceErrorCode) {
    super(code);
    this.name = "ProvisioningOperationServiceError";
    this.code = code;
  }
}

export class ProvisioningOperationConflictError extends Error {
  readonly code = "PROVISIONING_OPERATION_CONFLICT" as const;

  constructor() {
    super("PROVISIONING_OPERATION_CONFLICT");
    this.name = "ProvisioningOperationConflictError";
  }
}

export class ProvisioningOperationBusyError extends Error {
  readonly code = "PROVISIONING_OPERATION_BUSY" as const;

  constructor() {
    super("PROVISIONING_OPERATION_BUSY");
    this.name = "ProvisioningOperationBusyError";
  }
}

export class ProvisioningOperationLostLeaseError extends Error {
  readonly code = "PROVISIONING_OPERATION_LOST_LEASE" as const;

  constructor() {
    super("PROVISIONING_OPERATION_LOST_LEASE");
    this.name = "ProvisioningOperationLostLeaseError";
  }
}

export const PROVISIONING_LEASE_SECONDS = 120;

const modes = new Set<ProvisioningMode>(["paid", "free", "trial"]);
const statuses = new Set<ProvisioningOperationStatus>(["running", "partial", "completed", "failed"]);
const steps = new Set<ProvisioningStep>([
  "validate", "resolve_student", "create_order", "ensure_account", "grant_access", "send_email", "complete",
]);
const stepStates = new Set<StepState>([
  "created", "existing", "granted", "sent", "skipped", "failed", "not_applicable",
]);
const studentStates = new Set<StudentProvisioningState>(["created", "existing", "skipped", "failed", "not_applicable"]);
const orderStates = new Set<OrderProvisioningState>(["created", "existing", "skipped", "failed", "not_applicable"]);
const accessStates = new Set<AccessProvisioningState>(["existing", "granted", "skipped", "failed", "not_applicable"]);
const emailStates = new Set<EmailProvisioningState>(["sent", "skipped", "failed", "not_applicable"]);
const nextActions = new Set<ProvisioningNextAction>(["retry_access", "retry_email"]);
const errorCodes = new Set<ProvisioningErrorCode>([
  "VALIDATION_FAILED", "STUDENT_RESOLUTION_FAILED", "ORDER_CREATION_FAILED", "ACCOUNT_SETUP_FAILED",
  "ACCESS_GRANT_FAILED", "EMAIL_SEND_FAILED", "OPERATION_FAILED",
]);
const operationIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fingerprintPattern = /^[a-f0-9]{64}$/;
const safeCodePattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;

function invalidInput(): never {
  throw new ProvisioningOperationServiceError("PROVISIONING_INVALID_INPUT");
}

function cleanOperationId(value: unknown) {
  if (typeof value !== "string") invalidInput();
  const clean = value.trim();
  if (!operationIdPattern.test(clean)) invalidInput();
  return clean;
}

function cleanFingerprint(value: unknown) {
  if (typeof value !== "string") invalidInput();
  const clean = value.trim().toLowerCase();
  if (!fingerprintPattern.test(clean)) invalidInput();
  return clean;
}

function cleanMode(value: unknown): ProvisioningMode {
  if (typeof value !== "string") invalidInput();
  const clean = value.trim().toLowerCase();
  if (!modes.has(clean as ProvisioningMode)) invalidInput();
  return clean as ProvisioningMode;
}

function cleanStatus(value: unknown): ProvisioningOperationStatus {
  if (typeof value !== "string" || !statuses.has(value as ProvisioningOperationStatus)) invalidInput();
  return value as ProvisioningOperationStatus;
}

function cleanStep(value: unknown): ProvisioningStep {
  if (typeof value !== "string" || !steps.has(value as ProvisioningStep)) invalidInput();
  return value as ProvisioningStep;
}

function cleanUuid(value: unknown, nullable: boolean) {
  if (nullable && (value === null || value === undefined || value === "")) return null;
  if (typeof value !== "string" || !uuidPattern.test(value)) invalidInput();
  return value.toLowerCase();
}

function cleanSafeCode(value: unknown, nullable: boolean) {
  if (nullable && (value === null || value === undefined || value === "")) return null;
  if (typeof value !== "string") invalidInput();
  const clean = value.trim();
  if (!safeCodePattern.test(clean)) invalidInput();
  return clean;
}

function cleanCourseSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) invalidInput();
  const clean = value.map((item) => {
    if (typeof item !== "string") invalidInput();
    const slug = item.trim().toLowerCase();
    if (!slug || slug.length > 120 || !/^[a-z0-9][a-z0-9._-]*$/.test(slug)) invalidInput();
    return slug;
  });
  const unique = Array.from(new Set(clean)).sort();
  if (unique.length > 50) invalidInput();
  return unique;
}

function cleanStepState(value: unknown): StepState {
  if (typeof value !== "string" || !stepStates.has(value as StepState)) invalidInput();
  return value as StepState;
}

function cleanFieldState<T extends StepState>(value: unknown, allowed: Set<T>): T {
  const state = cleanStepState(value);
  if (!allowed.has(state as T)) invalidInput();
  return state as T;
}

function assertObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidInput();
  return value as Record<string, unknown>;
}

function assertNoExtraKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) invalidInput();
}

function rebuildSafeResult(value: unknown, rejectExtraKeys: boolean): SafeProvisioningResult {
  const source = assertObject(value);
  if (rejectExtraKeys) assertNoExtraKeys(source, ["student", "order", "access", "email", "nextActions", "errorCode"]);
  const clean: SafeProvisioningResult = {};

  if (source.student !== undefined) {
    const student = assertObject(source.student);
    if (rejectExtraKeys) assertNoExtraKeys(student, ["state"]);
    clean.student = { state: cleanFieldState(student.state, studentStates) };
  }
  if (source.order !== undefined) {
    const order = assertObject(source.order);
    if (rejectExtraKeys) assertNoExtraKeys(order, ["state", "orderCode"]);
    const orderCode = cleanSafeCode(order.orderCode, true);
    clean.order = { state: cleanFieldState(order.state, orderStates), ...(orderCode ? { orderCode } : {}) };
  }
  if (source.access !== undefined) {
    const access = assertObject(source.access);
    if (rejectExtraKeys) assertNoExtraKeys(access, ["state", "courseSlugs"]);
    clean.access = {
      state: cleanFieldState(access.state, accessStates),
      ...(access.courseSlugs === undefined ? {} : { courseSlugs: cleanCourseSlugs(access.courseSlugs) }),
    };
  }
  if (source.email !== undefined) {
    const email = assertObject(source.email);
    if (rejectExtraKeys) assertNoExtraKeys(email, ["state"]);
    clean.email = { state: cleanFieldState(email.state, emailStates) };
  }
  if (source.nextActions !== undefined) {
    if (!Array.isArray(source.nextActions)) invalidInput();
    const actions = source.nextActions.map((action) => {
      if (typeof action !== "string" || !nextActions.has(action as ProvisioningNextAction)) invalidInput();
      return action as ProvisioningNextAction;
    });
    clean.nextActions = Array.from(new Set(actions)).sort();
  }
  if (source.errorCode !== undefined) {
    if (typeof source.errorCode !== "string" || !errorCodes.has(source.errorCode as ProvisioningErrorCode)) invalidInput();
    clean.errorCode = source.errorCode as ProvisioningErrorCode;
  }
  return clean;
}

function validateCompletedOutcome(
  status: ProvisioningOperationStatus,
  currentStep: ProvisioningStep,
  safeResult: SafeProvisioningResult,
) {
  if (status !== "completed") return;
  if (currentStep !== "complete") invalidInput();
  if (!safeResult.student || !safeResult.order || !safeResult.access || !safeResult.email) invalidInput();
  if (!Array.isArray(safeResult.nextActions) || safeResult.nextActions.length !== 0) invalidInput();
  if (safeResult.errorCode !== undefined) invalidInput();
  if ([safeResult.student.state, safeResult.order.state, safeResult.access.state, safeResult.email.state].includes("failed")) {
    invalidInput();
  }
}

function normalizeTrialExpiry(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") invalidInput();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) invalidInput();
  return date.toISOString();
}

export function createProvisioningRequestFingerprint(input: ProvisioningRequestFingerprintInput) {
  const source = assertObject(input);
  if (typeof source.email !== "string" || typeof source.phone !== "string") invalidInput();
  if (!Array.isArray(source.courseSlugs)) invalidInput();
  if (typeof source.sendEmail !== "boolean") invalidInput();
  if (source.trialExpiresAt !== undefined && source.trialExpiresAt !== null && typeof source.trialExpiresAt !== "string") invalidInput();
  const email = source.email.trim().toLowerCase();
  const phone = source.phone.replace(/\D/g, "");
  if (!email && !phone) invalidInput();
  const normalized = {
    mode: cleanMode(source.mode),
    email,
    phone,
    courseSlugs: cleanCourseSlugs(source.courseSlugs),
    trialExpiresAt: normalizeTrialExpiry(source.trialExpiresAt as string | null | undefined),
    sendEmail: source.sendEmail,
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ProvisioningOperationServiceError("PROVISIONING_CLIENT_UNAVAILABLE");
  }
  let client;
  try {
    client = createSupabaseAdminClient();
  } catch {
    throw new ProvisioningOperationServiceError("PROVISIONING_CLIENT_UNAVAILABLE");
  }
  if (!client) throw new ProvisioningOperationServiceError("PROVISIONING_CLIENT_UNAVAILABLE");
  return client;
}

async function runQuery<T>(query: () => PromiseLike<T>): Promise<T> {
  try {
    return await query();
  } catch {
    throw new ProvisioningOperationServiceError("PROVISIONING_QUERY_FAILED");
  }
}

type SafeQueryResult<T> = {
  data: T | null;
  error: { code?: string } | null;
};

function parseQueryResult<T>(value: unknown): SafeQueryResult<T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProvisioningOperationServiceError("PROVISIONING_QUERY_FAILED");
  }
  const source = value as Record<string, unknown>;
  if (!("data" in source) || !("error" in source)) {
    throw new ProvisioningOperationServiceError("PROVISIONING_QUERY_FAILED");
  }
  if (source.error !== null && (!source.error || typeof source.error !== "object" || Array.isArray(source.error))) {
    throw new ProvisioningOperationServiceError("PROVISIONING_QUERY_FAILED");
  }
  return { data: (source.data ?? null) as T | null, error: source.error as { code?: string } | null };
}

function mapProvisioningOperation(row: unknown): ProvisioningOperation {
  try {
    const source = assertObject(row);
    const id = cleanUuid(source.id, false);
    const operationId = cleanOperationId(source.operation_id);
    const requestFingerprint = cleanFingerprint(source.request_fingerprint);
    const mode = cleanMode(source.mode);
    const status = cleanStatus(source.status);
    const currentStep = cleanStep(source.current_step);
    const orderCode = cleanSafeCode(source.order_code, true);
    const actorId = cleanUuid(source.actor_id, true);
    if (typeof source.created_at !== "string" || Number.isNaN(Date.parse(source.created_at))) invalidInput();
    if (typeof source.updated_at !== "string" || Number.isNaN(Date.parse(source.updated_at))) invalidInput();
    return {
      id: id!, operationId, requestFingerprint, mode, status, currentStep, orderCode,
      safeResult: rebuildSafeResult(source.safe_result, true), actorId,
      createdAt: source.created_at, updatedAt: source.updated_at,
    };
  } catch {
    throw new ProvisioningOperationServiceError("PROVISIONING_INVALID_ROW");
  }
}

function parseClaimPayload(value: unknown): {
  state: "new" | "resume" | "complete" | "conflict" | "busy";
  operation?: unknown;
} {
  try {
    const source = assertObject(value);
    assertNoExtraKeys(source, ["claim_state", "operation"]);
    const state = source.claim_state;
    if (typeof state !== "string" || !["new", "resume", "complete", "conflict", "busy"].includes(state)) invalidInput();
    const needsOperation = state === "new" || state === "resume" || state === "complete";
    if (needsOperation !== (source.operation !== undefined)) invalidInput();
    return { state: state as "new" | "resume" | "complete" | "conflict" | "busy", operation: source.operation };
  } catch {
    throw new ProvisioningOperationServiceError("PROVISIONING_QUERY_FAILED");
  }
}

function parseSavePayload(value: unknown): { state: "saved" | "lost_lease"; operation?: unknown } {
  try {
    const source = assertObject(value);
    assertNoExtraKeys(source, ["save_state", "operation"]);
    const state = source.save_state;
    if (state !== "saved" && state !== "lost_lease") invalidInput();
    if ((state === "saved") !== (source.operation !== undefined)) invalidInput();
    return { state, operation: source.operation };
  } catch {
    throw new ProvisioningOperationServiceError("PROVISIONING_QUERY_FAILED");
  }
}

export async function claimProvisioningOperation(input: {
  operationId: string;
  requestFingerprint: string;
  mode: ProvisioningMode;
  actorId?: string | null;
}): Promise<
  | { state: "new" | "resume"; operation: ProvisioningOperation; leaseToken: string }
  | { state: "complete"; operation: ProvisioningOperation }
> {
  const operationId = cleanOperationId(input.operationId);
  const requestFingerprint = cleanFingerprint(input.requestFingerprint);
  const mode = cleanMode(input.mode);
  const actorId = cleanUuid(input.actorId, true);
  const client = getAdminClient();
  const leaseToken = randomUUID();
  const insertResult = parseQueryResult<unknown>(await runQuery(() => client
    .rpc("claim_admin_student_provisioning_operation", {
      p_operation_id: operationId,
      p_request_fingerprint: requestFingerprint,
      p_mode: mode,
      p_actor_id: actorId,
      p_lease_token: leaseToken,
      p_lease_seconds: PROVISIONING_LEASE_SECONDS,
    })));
  if (insertResult.error || !insertResult.data) throw new ProvisioningOperationServiceError("PROVISIONING_QUERY_FAILED");
  const claim = parseClaimPayload(insertResult.data);
  if (claim.state === "conflict") throw new ProvisioningOperationConflictError();
  if (claim.state === "busy") throw new ProvisioningOperationBusyError();
  const operation = mapProvisioningOperation(claim.operation);
  if (operation.operationId !== operationId || operation.requestFingerprint !== requestFingerprint || operation.mode !== mode) {
    throw new ProvisioningOperationServiceError("PROVISIONING_INVALID_ROW");
  }
  if ((claim.state === "complete") !== (operation.status === "completed")) {
    throw new ProvisioningOperationServiceError("PROVISIONING_INVALID_ROW");
  }
  if ((claim.state === "new" || claim.state === "resume") && operation.status !== "running") {
    throw new ProvisioningOperationServiceError("PROVISIONING_INVALID_ROW");
  }
  if (claim.state === "complete") {
    try {
      validateCompletedOutcome(operation.status, operation.currentStep, operation.safeResult);
    } catch {
      throw new ProvisioningOperationServiceError("PROVISIONING_INVALID_ROW");
    }
  }
  if (claim.state === "complete") return { state: "complete", operation };
  return { state: claim.state, operation, leaseToken };
}

export async function saveProvisioningOutcome(input: {
  operationId: string;
  leaseToken: string;
  status: ProvisioningOperationStatus;
  currentStep: ProvisioningStep;
  orderCode?: string | null;
  safeResult: SafeProvisioningResult;
}): Promise<ProvisioningOperation> {
  const operationId = cleanOperationId(input.operationId);
  const leaseToken = cleanUuid(input.leaseToken, false)!;
  const status = cleanStatus(input.status);
  const currentStep = cleanStep(input.currentStep);
  const orderCode = cleanSafeCode(input.orderCode, true);
  const safeResult = rebuildSafeResult(input.safeResult, false);
  validateCompletedOutcome(status, currentStep, safeResult);
  const client = getAdminClient();
  const result = parseQueryResult<unknown>(await runQuery(() => client
    .rpc("save_admin_student_provisioning_outcome", {
      p_operation_id: operationId,
      p_lease_token: leaseToken,
      p_status: status,
      p_current_step: currentStep,
      p_order_code: orderCode,
      p_safe_result: safeResult,
      p_lease_seconds: PROVISIONING_LEASE_SECONDS,
    })));

  if (result.error || !result.data) throw new ProvisioningOperationServiceError("PROVISIONING_QUERY_FAILED");
  const saved = parseSavePayload(result.data);
  if (saved.state === "lost_lease") throw new ProvisioningOperationLostLeaseError();
  const operation = mapProvisioningOperation(saved.operation);
  if (
    operation.operationId !== operationId
    || operation.status !== status
    || operation.currentStep !== currentStep
    || operation.orderCode !== orderCode
    || JSON.stringify(operation.safeResult) !== JSON.stringify(safeResult)
  ) {
    throw new ProvisioningOperationServiceError("PROVISIONING_INVALID_ROW");
  }
  return operation;
}

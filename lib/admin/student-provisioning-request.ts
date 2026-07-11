export type ParsedStudentProvisioningRequest = {
  operationId: string;
  mode: "paid" | "free" | "trial";
  name: string;
  phone: string;
  email: string;
  courseSlugs: string[];
  source: string;
  note?: string;
  trialExpiresAt?: string;
  sendEmail: boolean;
};

const allowedKeys = new Set([
  "operationId", "mode", "name", "phone", "email", "courseSlugs", "source", "note", "trialExpiresAt", "sendEmail",
]);
const operationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9][a-z0-9._-]{0,119}$/;

export class StudentProvisioningRequestError extends Error {
  readonly code = "INVALID_STUDENT_PROVISIONING_REQUEST" as const;
  constructor() { super("INVALID_STUDENT_PROVISIONING_REQUEST"); this.name = "StudentProvisioningRequestError"; }
}

function invalid(): never { throw new StudentProvisioningRequestError(); }
function text(value: unknown, max: number) {
  if (typeof value !== "string") invalid();
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) invalid();
  return normalized;
}

export function parseStudentProvisioningRequest(value: unknown): ParsedStudentProvisioningRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) invalid();

  const operationId = text(body.operationId, 80).toLowerCase();
  const mode = body.mode;
  const name = text(body.name, 160);
  const email = text(body.email, 254).toLowerCase();
  const phone = text(body.phone, 40).replace(/\D/g, "");
  const source = text(body.source, 80);
  if (!operationIdPattern.test(operationId) || !["paid", "free", "trial"].includes(String(mode))) invalid();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{8,15}$/.test(phone)) invalid();
  if (!Array.isArray(body.courseSlugs) || body.courseSlugs.length === 0 || body.courseSlugs.length > 50) invalid();
  const courseSlugs = Array.from(new Set(body.courseSlugs.map((slug) => text(slug, 120).toLowerCase()))).sort();
  if (courseSlugs.some((slug) => !slugPattern.test(slug))) invalid();
  if (typeof body.sendEmail !== "boolean") invalid();

  const note = body.note === undefined ? undefined : typeof body.note === "string" ? body.note.trim() : invalid();
  if (note !== undefined && note.length > 500) invalid();
  let trialExpiresAt: string | undefined;
  if (mode === "trial") {
    if (typeof body.trialExpiresAt !== "string") invalid();
    const expiry = Date.parse(body.trialExpiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) invalid();
    trialExpiresAt = new Date(expiry).toISOString();
  } else if (body.trialExpiresAt !== undefined && body.trialExpiresAt !== "") {
    invalid();
  }

  return {
    operationId,
    mode: mode as ParsedStudentProvisioningRequest["mode"],
    name,
    phone,
    email,
    courseSlugs,
    source,
    ...(note ? { note } : {}),
    ...(trialExpiresAt ? { trialExpiresAt } : {}),
    sendEmail: body.sendEmail,
  };
}

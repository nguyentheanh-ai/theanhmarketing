import { getStudentAppStagingAccessHeaders } from "@/lib/cloudflare/student-app-access";
import { fetchStudentApp } from "@/lib/cloudflare/student-app-fetch";

type StudentPortalOrderInput = {
  orderCode: string;
  studentName: string;
  email: string;
  phone: string;
  courseSlug: string;
};

type BuildStudentPortalProvisioningPayloadInput = {
  order: StudentPortalOrderInput;
  userId?: string | null;
};

export type StudentPortalProvisioningPayload = {
  email: string;
  fullName: string;
  phone: string;
  accessKey: string;
  orderCode: string;
  source: string;
};

export type StudentPortalProvisioningResult = {
  ok: boolean;
  skipped: boolean;
  reason: string | null;
  status?: number;
};

export function buildStudentPortalProvisioningPayload({
  order,
}: BuildStudentPortalProvisioningPayloadInput): StudentPortalProvisioningPayload {
  const payload: StudentPortalProvisioningPayload = {
    email: order.email.trim().toLowerCase(),
    fullName: order.studentName.trim(),
    phone: order.phone.trim(),
    accessKey: order.courseSlug.trim(),
    orderCode: order.orderCode.trim(),
    source: "theanhmarketing.com",
  };

  return payload;
}

export async function notifyStudentPortalProvisioning({
  order,
}: BuildStudentPortalProvisioningPayloadInput): Promise<StudentPortalProvisioningResult> {
  const endpoint = process.env.STUDENT_PORTAL_PROVISION_URL?.trim();
  const secret = process.env.STUDENT_PORTAL_PROVISION_SECRET?.trim();

  if (!endpoint || !secret) {
    return {
      ok: true,
      skipped: true,
      reason: "Student portal provisioning env is not configured.",
    };
  }

  const payload = buildStudentPortalProvisioningPayload({ order });

  const response = await fetchStudentApp(endpoint, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "content-type": "application/json",
      "x-student-portal-secret": secret,
      ...getStudentAppStagingAccessHeaders(endpoint),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await response.body?.cancel();
    return { ok: false, skipped: false, reason: `Student portal provisioning failed with status ${response.status}.`, status: response.status };
  }
  // A dashboard/login HTML page or dry-run200 is not a successful DB write.
  // Read only a bounded JSON acknowledgement; never forward its raw payload
  // into logs (it contains identity details).
  let acknowledgement: { ok?: unknown; mode?: unknown; payload?: { email?: unknown; userId?: unknown } } | null = null;
  try {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Missing acknowledgement');
    let bytes = 0; const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const item = await reader.read(); if (item.done) break;
        bytes += item.value.byteLength;
        if (bytes > 16_384) throw new Error('Oversized acknowledgement');
        chunks.push(item.value);
      }
    } finally { await reader.cancel().catch(() => undefined); }
    const buffer = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    acknowledgement = JSON.parse(new TextDecoder().decode(buffer));
  } catch { /* fail closed below, never log response body */ }
  if (acknowledgement?.ok !== true || acknowledgement.mode !== 'write'
      || acknowledgement.payload?.email !== payload.email
      || typeof acknowledgement.payload?.userId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(acknowledgement.payload.userId)) {
    return { ok: false, skipped: false, reason: 'Student portal did not acknowledge the matching profile write.', status: response.status };
  }
  return { ok: true, skipped: false, reason: null, status: response.status };
}

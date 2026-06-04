type StudentPortalOrderInput = {
  orderCode: string;
  studentName: string;
  email: string;
  phone: string;
  courseSlug: string;
};

type BuildStudentPortalProvisioningPayloadInput = {
  order: StudentPortalOrderInput;
  userId: string | null;
};

export type StudentPortalProvisioningPayload = {
  userId?: string;
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
  userId,
}: BuildStudentPortalProvisioningPayloadInput): StudentPortalProvisioningPayload {
  const payload: StudentPortalProvisioningPayload = {
    email: order.email.trim().toLowerCase(),
    fullName: order.studentName.trim(),
    phone: order.phone.trim(),
    accessKey: order.courseSlug.trim(),
    orderCode: order.orderCode.trim(),
    source: "theanhmarketing.com",
  };

  if (userId) {
    payload.userId = userId;
  }

  return payload;
}

export async function notifyStudentPortalProvisioning({
  order,
  userId,
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

  const payload = buildStudentPortalProvisioningPayload({ order, userId });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-student-portal-secret": secret,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      skipped: false,
      reason: body || `Student portal provisioning failed with status ${response.status}.`,
      status: response.status,
    };
  }

  return {
    ok: true,
    skipped: false,
    reason: null,
    status: response.status,
  };
}

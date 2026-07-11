import {
  claimProvisioningOperation,
  createProvisioningRequestFingerprint,
  finalizeProvisioningOutcome,
  saveProvisioningOutcome,
  type ProvisioningMode,
  type ProvisioningOperation,
  type ProvisioningStep,
  type SafeProvisioningResult,
  type StepState,
} from "@/services/studentProvisioningOperationService";
import {
  createManualPaidOrder,
  findManualPaidOrderByProvisioningOperationId,
  markPaymentEmailSent,
  type PaymentOrder,
} from "@/services/orderService";
import {
  ensureStudentAccountForAccessGrant,
  ensureStudentAccountForPaidOrder,
} from "@/services/studentAccountService";
import { provisionLmsEnrollmentAtomically } from "@/services/lmsService";
import { getCourses } from "@/services/courseService";
import { createLeadAdmin, findLeadByProvisioningOperationId } from "@/services/leadService";
import { sendPaymentSuccessEmail } from "@/lib/notifications/payment-success-email";
import { sendStudentAccessEmail } from "@/lib/notifications/student-access-email";
import { getCourseAccessSlugs } from "@/lib/course-access";
import {
  beginProvisioningEmailDispatch,
  finishProvisioningEmailDispatch,
} from "@/services/studentProvisioningControlService";

export type ProvisionStudentInput = {
  operationId: string;
  actorId?: string | null;
  mode: ProvisioningMode;
  name: string;
  email: string;
  phone: string;
  courseSlugs: string[];
  source: string;
  note?: string;
  trialExpiresAt?: string | null;
  sendEmail: boolean;
  temporaryPassword?: string;
};

export type ProvisionStudentResult = {
  ok: boolean;
  operationId: string;
  student: { state: StepState; reason?: string };
  order: { state: StepState; orderCode?: string; reason?: string };
  access: { state: StepState; courseSlugs: string[]; reason?: string };
  email: { state: StepState; reason?: string };
  temporaryCredential?: { email: string; temporaryPassword: string };
  nextActions: Array<"retry_access" | "retry_email" | "review_email">;
};

type AccountResult = {
  ok: boolean;
  skipped: boolean;
  created: boolean;
  email: string;
  temporaryPassword: string | null;
  userId: string | null;
  reason?: string | null;
};

type EmailResult = { ok: boolean; skipped: boolean; reason?: string | null; resendEmailId?: string | null };
type CourseLike = { slug: string; title: string };

export type StudentProvisioningDependencies = {
  createFingerprint: typeof createProvisioningRequestFingerprint;
  claimOperation: typeof claimProvisioningOperation;
  saveOutcome: typeof saveProvisioningOutcome;
  finalizeOutcome: typeof finalizeProvisioningOutcome;
  findOrderByOperationId: (operationId: string) => Promise<PaymentOrder | null>;
  createPaidOrder: typeof createManualPaidOrder;
  ensurePaidAccount: typeof ensureStudentAccountForPaidOrder;
  ensureAccessAccount: typeof ensureStudentAccountForAccessGrant;
  getCourses: () => Promise<CourseLike[]>;
  provisionEnrollment: (input: {
    operationId: string;
    leaseToken: string;
    mode: "free" | "trial";
    studentName: string;
    email: string;
    phone: string;
    userId: string | null;
    courseSlug: string;
    expiresAt: string | null;
  }) => Promise<{ id: string; outcome: "granted" | "already_unlimited" | "already_paid"; accessKind: string; expiresAt: string | null }>;
  verifyPaidAccess: (order: PaymentOrder, courseSlugs: string[]) => boolean;
  findLeadByOperationId: (operationId: string) => Promise<unknown | null>;
  createLead: typeof createLeadAdmin;
  sendPaidEmail: typeof sendPaymentSuccessEmail;
  sendAccessEmail: typeof sendStudentAccessEmail;
  markPaidEmailSent: (orderCode: string) => Promise<unknown>;
  beginEmailDispatch: typeof beginProvisioningEmailDispatch;
  finishEmailDispatch: typeof finishProvisioningEmailDispatch;
};

const runtimeDependencies: StudentProvisioningDependencies = {
  createFingerprint: createProvisioningRequestFingerprint,
  claimOperation: claimProvisioningOperation,
  saveOutcome: saveProvisioningOutcome,
  finalizeOutcome: finalizeProvisioningOutcome,
  findOrderByOperationId: findManualPaidOrderByProvisioningOperationId,
  createPaidOrder: createManualPaidOrder,
  ensurePaidAccount: ensureStudentAccountForPaidOrder,
  ensureAccessAccount: ensureStudentAccountForAccessGrant,
  getCourses,
  provisionEnrollment: provisionLmsEnrollmentAtomically,
  verifyPaidAccess: (order, courseSlugs) => {
    const accessible = new Set(getCourseAccessSlugs({ email: order.email, orders: [order] }));
    return courseSlugs.every((slug) => accessible.has(slug));
  },
  findLeadByOperationId: findLeadByProvisioningOperationId,
  createLead: createLeadAdmin,
  sendPaidEmail: sendPaymentSuccessEmail,
  sendAccessEmail: sendStudentAccessEmail,
  markPaidEmailSent: markPaymentEmailSent,
  beginEmailDispatch: beginProvisioningEmailDispatch,
  finishEmailDispatch: finishProvisioningEmailDispatch,
};

export class StudentProvisioningError extends Error {
  constructor(readonly code: "PROVISIONING_VALIDATION_FAILED" | "PROVISIONING_STEP_FAILED") {
    super(code);
    this.name = "StudentProvisioningError";
  }
}

function validateInput(input: ProvisionStudentInput) {
  if (!input || typeof input !== "object") throw new StudentProvisioningError("PROVISIONING_VALIDATION_FAILED");
  if (!["paid", "free", "trial"].includes(input.mode)) throw new StudentProvisioningError("PROVISIONING_VALIDATION_FAILED");
  if (
    typeof input.operationId !== "string"
    || typeof input.name !== "string"
    || typeof input.email !== "string"
    || typeof input.phone !== "string"
    || typeof input.source !== "string"
    || typeof input.sendEmail !== "boolean"
    || !input.operationId.trim()
    || !input.name.trim()
    || input.name.length > 160
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
    || !/^\d{8,15}$/.test(input.phone.replace(/\D/g, ""))
    || !input.source.trim()
    || input.source.length > 80
  ) {
    throw new StudentProvisioningError("PROVISIONING_VALIDATION_FAILED");
  }
  if (
    !Array.isArray(input.courseSlugs)
    || input.courseSlugs.length === 0
    || input.courseSlugs.length > 50
    || input.courseSlugs.some((slug) => typeof slug !== "string" || !/^[a-z0-9][a-z0-9._-]{0,119}$/i.test(slug.trim()))
    || (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 500))
    || input.temporaryPassword !== undefined
  ) {
    throw new StudentProvisioningError("PROVISIONING_VALIDATION_FAILED");
  }
  if (input.mode === "trial") {
    const expiry = Date.parse(input.trialExpiresAt ?? "");
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      throw new StudentProvisioningError("PROVISIONING_VALIDATION_FAILED");
    }
  } else if (input.trialExpiresAt) {
    throw new StudentProvisioningError("PROVISIONING_VALIDATION_FAILED");
  }
}

function completedResult(operationId: string, safe: SafeProvisioningResult): ProvisionStudentResult {
  return {
    ok: true,
    operationId,
    student: { state: safe.student?.state ?? "existing" },
    order: { state: safe.order?.state ?? "not_applicable", ...(safe.order?.orderCode ? { orderCode: safe.order.orderCode } : {}) },
    access: { state: safe.access?.state ?? "existing", courseSlugs: safe.access?.courseSlugs ?? [] },
    email: { state: safe.email?.state ?? "skipped" },
    nextActions: [],
  };
}

function safeFrom(operation: ProvisioningOperation): SafeProvisioningResult {
  return JSON.parse(JSON.stringify(operation.safeResult ?? {})) as SafeProvisioningResult;
}

function isLeaseFailure(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error
    && (error as { code?: string }).code === "PROVISIONING_OPERATION_LOST_LEASE");
}

export async function provisionStudent(
  input: ProvisionStudentInput,
  dependencies: StudentProvisioningDependencies = runtimeDependencies,
): Promise<ProvisionStudentResult> {
  validateInput(input);
  const courseSlugs = Array.from(new Set(input.courseSlugs.map((slug) => slug.trim().toLowerCase()))).sort();
  const expiry = input.mode === "trial" ? new Date(input.trialExpiresAt!).toISOString() : null;
  let courses: CourseLike[];
  try { courses = await dependencies.getCourses(); } catch { throw new StudentProvisioningError("PROVISIONING_STEP_FAILED"); }
  const courseBySlug = new Map(courses.map((course) => [course.slug, course]));
  if (courseSlugs.some((slug) => !courseBySlug.has(slug))) {
    throw new StudentProvisioningError("PROVISIONING_VALIDATION_FAILED");
  }
  const fingerprint = dependencies.createFingerprint({
    mode: input.mode,
    name: input.name,
    email: input.email,
    phone: input.phone,
    courseSlugs,
    trialExpiresAt: expiry,
    sendEmail: input.sendEmail,
  });
  const claim = await dependencies.claimOperation({
    operationId: input.operationId,
    requestFingerprint: fingerprint,
    mode: input.mode,
    actorId: input.actorId ?? null,
  });
  if (claim.state === "complete") return completedResult(input.operationId, claim.operation.safeResult);

  const leaseToken = claim.leaseToken;
  const safe = safeFrom(claim.operation);
  let order: PaymentOrder | null = null;
  let account: AccountResult | null = null;
  let temporaryCredential: ProvisionStudentResult["temporaryCredential"];

  const renewLease = async (currentStep: ProvisioningStep) => {
    await dependencies.saveOutcome({
      operationId: input.operationId,
      leaseToken,
      status: "running",
      currentStep,
      orderCode: order?.orderCode ?? claim.operation.orderCode,
      safeResult: safe,
    });
  };
  const persist = async (status: "running" | "partial" | "completed" | "failed", currentStep: ProvisioningStep) => {
    const outcome = {
      operationId: input.operationId,
      leaseToken,
      currentStep,
      orderCode: order?.orderCode ?? claim.operation.orderCode,
      safeResult: safe,
    };
    if (status === "running") {
      await dependencies.saveOutcome({ ...outcome, status });
      return;
    }
    try {
      await dependencies.finalizeOutcome({ ...outcome, status, courseSlugs });
    } catch (error) {
      if (isLeaseFailure(error)) throw error;
      throw new StudentProvisioningError("PROVISIONING_STEP_FAILED");
    }
  };

  if (input.mode === "paid") {
    try {
      await renewLease("create_order");
      order = await dependencies.findOrderByOperationId(input.operationId);
      if (!order) {
        order = await dependencies.createPaidOrder({
          studentName: input.name,
          email: input.email,
          phone: input.phone,
          courseSlugs,
          note: input.note,
          provisioningOperationId: input.operationId,
        });
        safe.order = { state: "created", orderCode: order.orderCode };
      } else {
        safe.order = { state: "existing", orderCode: order.orderCode };
      }
    } catch (error) {
      if (isLeaseFailure(error)) throw error;
      safe.student = { state: "not_applicable" };
      safe.order = { state: "failed" };
      safe.access = { state: "not_applicable", courseSlugs };
      safe.email = { state: "not_applicable" };
      safe.nextActions = [];
      safe.errorCode = "ORDER_CREATION_FAILED";
      await persist("failed", "create_order");
      return {
        ok: false, operationId: input.operationId, student: { state: "not_applicable" },
        order: { state: "failed", reason: "ORDER_CREATION_FAILED" },
        access: { state: "not_applicable", courseSlugs }, email: { state: "not_applicable" }, nextActions: [],
      };
    }
    await persist("running", "ensure_account");
  } else {
    safe.order = { state: "not_applicable" };
    await renewLease("resolve_student");
    try {
      const existingLead = await dependencies.findLeadByOperationId(input.operationId);
      if (!existingLead) {
        const lead = await dependencies.createLead({
          name: input.name,
          phone: input.phone,
          email: input.email,
          source: `admin-student:${input.source}`,
          message: input.note ?? "",
          syncGoogleSheet: false,
          provisioningOperationId: input.operationId,
        });
        if (!lead.ok) throw new StudentProvisioningError("PROVISIONING_STEP_FAILED");
      }
    } catch (error) {
      if (isLeaseFailure(error)) throw error;
      safe.student = { state: "failed" };
      safe.access = { state: "not_applicable", courseSlugs };
      safe.email = { state: "not_applicable" };
      safe.nextActions = [];
      safe.errorCode = "STUDENT_RESOLUTION_FAILED";
      await persist("failed", "resolve_student");
      return {
        ok: false, operationId: input.operationId, student: { state: "failed", reason: "STUDENT_RESOLUTION_FAILED" },
        order: { state: "not_applicable" }, access: { state: "not_applicable", courseSlugs },
        email: { state: "not_applicable" }, nextActions: [],
      };
    }
  }

  await renewLease("ensure_account");
  try {
    if (input.mode === "paid") {
      account = await dependencies.ensurePaidAccount(order!, {
        forcePasswordUpdate: false,
        preserveExistingAuth: true,
        provisioningOperationId: input.operationId,
      });
    } else {
      const firstCourse = courseBySlug.get(courseSlugs[0])!;
      account = await dependencies.ensureAccessAccount({
        studentName: input.name,
        email: input.email,
        phone: input.phone,
        courseSlug: firstCourse.slug,
        courseTitle: firstCourse.title,
        sourceOrderCode: `ACCESS-${input.operationId}`,
      }, {
        forcePasswordUpdate: false,
        preserveExistingAuth: true,
        provisioningOperationId: input.operationId,
      });
    }
  } catch (error) {
    if (isLeaseFailure(error)) throw error;
    account = {
      ok: false, skipped: false, created: false, email: input.email,
      temporaryPassword: null, userId: null, reason: "ACCOUNT_PROVIDER_FAILED",
    };
  }
  if (!account.ok) {
    safe.student = { state: "failed" };
    safe.access = { state: "not_applicable", courseSlugs };
    safe.email = { state: "not_applicable" };
    safe.nextActions = [];
    safe.errorCode = "ACCOUNT_SETUP_FAILED";
    await persist("failed", "ensure_account");
    return {
      ok: false, operationId: input.operationId,
      student: { state: "failed", reason: "ACCOUNT_SETUP_FAILED" },
      order: { state: safe.order.state, ...(safe.order.orderCode ? { orderCode: safe.order.orderCode } : {}) },
      access: { state: "not_applicable", courseSlugs }, email: { state: "not_applicable" }, nextActions: [],
    };
  }
  safe.student = { state: account.created ? "created" : "existing" };
  if (account.temporaryPassword) {
    temporaryCredential = { email: account.email, temporaryPassword: account.temporaryPassword };
  }
  await persist("running", "grant_access");

  if (input.mode === "paid") {
    if (!dependencies.verifyPaidAccess(order!, courseSlugs)) {
      safe.access = { state: "failed", courseSlugs };
      safe.email = { state: "not_applicable" };
      safe.nextActions = ["retry_access"];
      safe.errorCode = "ACCESS_GRANT_FAILED";
      await persist("partial", "grant_access");
      return {
        ok: false, operationId: input.operationId, student: { state: safe.student.state },
        order: { state: safe.order.state, orderCode: order!.orderCode },
        access: { state: "failed", courseSlugs, reason: "PAID_ORDER_ACCESS_NOT_VERIFIED" },
        email: { state: "not_applicable" }, temporaryCredential, nextActions: ["retry_access"],
      };
    }
    safe.access = { state: "granted", courseSlugs };
  } else {
    let granted = false;
    try {
      for (const courseSlug of courseSlugs) {
        await renewLease("grant_access");
        const enrollment = await dependencies.provisionEnrollment({
          operationId: input.operationId,
          leaseToken,
          mode: input.mode,
          studentName: input.name,
          email: input.email,
          phone: input.phone,
          userId: account.userId,
          courseSlug,
          expiresAt: expiry,
        });
        if (enrollment.outcome === "granted") granted = true;
      }
    } catch (error) {
      if (isLeaseFailure(error)) throw error;
      safe.access = { state: "failed", courseSlugs };
      safe.email = { state: "not_applicable" };
      safe.nextActions = ["retry_access"];
      safe.errorCode = "ACCESS_GRANT_FAILED";
      await persist("partial", "grant_access");
      return {
        ok: false, operationId: input.operationId, student: { state: safe.student.state },
        order: { state: safe.order.state }, access: { state: "failed", courseSlugs },
        email: { state: "not_applicable" }, temporaryCredential, nextActions: ["retry_access"],
      };
    }
    safe.access = { state: granted ? "granted" : "existing", courseSlugs };
  }
  await persist("running", "send_email");

  if (!input.sendEmail) {
    safe.email = { state: "skipped" };
  } else if (input.mode === "paid" && order!.paymentEmailSentAt) {
    safe.email = { state: "sent" };
  } else {
    await renewLease("send_email");
    const dispatch = await dependencies.beginEmailDispatch({ operationId: input.operationId, leaseToken });
    if (dispatch.state === "manual_review") {
      safe.email = { state: "failed" };
      safe.nextActions = ["review_email"];
      safe.errorCode = "EMAIL_SEND_FAILED";
      await persist("partial", "send_email");
      return {
        ok: false, operationId: input.operationId, student: { state: safe.student.state },
        order: { state: safe.order.state, ...(safe.order.orderCode ? { orderCode: safe.order.orderCode } : {}) },
        access: { state: safe.access!.state, courseSlugs },
        email: { state: "failed", reason: "EMAIL_MANUAL_REVIEW_REQUIRED" },
        temporaryCredential, nextActions: ["review_email"],
      };
    }
    if (dispatch.state === "sent") {
      safe.email = { state: "sent" };
    } else {
    const idempotencyKey = dispatch.idempotencyKey!;
    let emailResult: EmailResult;
    let ambiguousProviderOutcome = false;
    try {
      emailResult = input.mode === "paid"
        ? await dependencies.sendPaidEmail(order!, {
          idempotencyKey,
          ...(temporaryCredential ? { account: { ...temporaryCredential, created: account.created, mustChangePassword: true } } : {}),
        })
        : await dependencies.sendAccessEmail({
          action: "grant", studentName: input.name, email: input.email,
          courseTitles: courseSlugs.map((slug) => courseBySlug.get(slug)!.title),
        }, {
          idempotencyKey,
          ...(temporaryCredential ? { account: { ...temporaryCredential, created: account.created, mustChangePassword: true } } : {}),
        });
    } catch (error) {
      if (isLeaseFailure(error)) throw error;
      ambiguousProviderOutcome = true;
      emailResult = { ok: false, skipped: false, reason: "EMAIL_PROVIDER_AMBIGUOUS" };
    }
    if (!emailResult.ok || emailResult.skipped) {
      const retryableLocalSkip = emailResult.ok && emailResult.skipped && !ambiguousProviderOutcome;
      const failedDispatch = await dependencies.finishEmailDispatch({
        operationId: input.operationId, leaseToken,
        state: retryableLocalSkip ? "retryable" : "manual_review", providerMessageId: null,
      });
      const needsReview = !retryableLocalSkip || failedDispatch.state === "manual_review";
      safe.email = { state: "failed" };
      safe.nextActions = needsReview ? ["review_email"] : ["retry_email"];
      safe.errorCode = "EMAIL_SEND_FAILED";
      await persist("partial", "send_email");
      return {
        ok: false, operationId: input.operationId, student: { state: safe.student.state },
        order: { state: safe.order.state, ...(safe.order.orderCode ? { orderCode: safe.order.orderCode } : {}) },
        access: { state: safe.access!.state, courseSlugs },
        email: { state: "failed", reason: needsReview ? "EMAIL_MANUAL_REVIEW_REQUIRED" : "EMAIL_RETRY_AVAILABLE" },
        temporaryCredential, nextActions: needsReview ? ["review_email"] : ["retry_email"],
      };
    }
    const finished = await dependencies.finishEmailDispatch({
      operationId: input.operationId, leaseToken, state: "sent", providerMessageId: emailResult.resendEmailId ?? null,
    });
    if (finished.state !== "sent") {
      safe.email = { state: "failed" };
      safe.nextActions = ["review_email"];
      safe.errorCode = "EMAIL_SEND_FAILED";
      await persist("partial", "send_email");
      return {
        ok: false, operationId: input.operationId, student: { state: safe.student.state },
        order: { state: safe.order.state, ...(safe.order.orderCode ? { orderCode: safe.order.orderCode } : {}) },
        access: { state: safe.access!.state, courseSlugs }, email: { state: "failed", reason: "EMAIL_MANUAL_REVIEW_REQUIRED" },
        temporaryCredential, nextActions: ["review_email"],
      };
    }
    safe.email = { state: "sent" };
    }
    if (input.mode === "paid") {
      try {
        const marker = await dependencies.markPaidEmailSent(order!.orderCode);
        if (!marker || typeof marker !== "object" || !("ok" in marker) || (marker as { ok?: unknown }).ok !== true) {
          throw new Error("PAYMENT_EMAIL_MARKER_FAILED");
        }
      } catch (error) {
        if (isLeaseFailure(error)) throw error;
        safe.nextActions = ["retry_email"];
        safe.errorCode = "EMAIL_SEND_FAILED";
        await persist("partial", "send_email");
        return {
          ok: false, operationId: input.operationId, student: { state: safe.student.state },
          order: { state: safe.order.state, orderCode: order!.orderCode },
          access: { state: safe.access!.state, courseSlugs },
          email: { state: "sent", reason: "EMAIL_CONFIRMATION_PENDING" },
          temporaryCredential, nextActions: ["retry_email"],
        };
      }
    }
  }

  safe.nextActions = [];
  delete safe.errorCode;
  await persist("completed", "complete");
  return {
    ok: true, operationId: input.operationId, student: { state: safe.student.state },
    order: { state: safe.order.state, ...(safe.order.orderCode ? { orderCode: safe.order.orderCode } : {}) },
    access: { state: safe.access!.state, courseSlugs }, email: { state: safe.email!.state },
    temporaryCredential, nextActions: [],
  };
}

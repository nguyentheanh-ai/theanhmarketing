"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Course } from "@/data/courses";
import { formatVietnamLocalDateTime, vietnamDateToLocalInput, vietnamLocalDateTimeToIso } from "@/lib/admin/vietnam-datetime";

type WizardStep = 1 | 2 | 3;
type ProvisioningMode = "paid" | "free" | "trial";
type StepState = "created" | "existing" | "granted" | "sent" | "skipped" | "failed" | "not_applicable";
type NextAction = "retry_access" | "retry_email" | "review_email";
type ProvisioningResult = {
  ok: boolean;
  operationId: string;
  mode?: ProvisioningMode;
  student: { state: StepState; reason?: string };
  order: { state: StepState; orderCode?: string; reason?: string };
  access: { state: StepState; courseSlugs: string[]; reason?: string };
  email: { state: StepState; reason?: string };
  nextActions: NextAction[];
};
type WizardState = {
  step: WizardStep;
  mode: ProvisioningMode;
  name: string;
  phone: string;
  email: string;
  courseSlugs: string[];
  source: string;
  note: string;
  trialExpiresAt: string;
  sendEmail: boolean;
  operationId: string;
};

const inputClass = "min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const stateLabels: Record<StepState, string> = {
  created: "Đã tạo", existing: "Đã có sẵn", granted: "Đã cấp", sent: "Đã gửi", skipped: "Không gửi",
  failed: "Chưa hoàn tất", not_applicable: "Không áp dụng",
};
const stateStyles: Record<StepState, string> = {
  created: "bg-emerald-50 text-emerald-800", existing: "bg-blue-50 text-blue-800", granted: "bg-emerald-50 text-emerald-800",
  sent: "bg-emerald-50 text-emerald-800", skipped: "bg-slate-100 text-slate-700", failed: "bg-red-50 text-red-800",
  not_applicable: "bg-slate-100 text-slate-500",
};
const studentStates = new Set<StepState>(["created", "existing", "skipped", "failed", "not_applicable"]);
const orderStates = new Set<StepState>(["created", "existing", "skipped", "failed", "not_applicable"]);
const accessStates = new Set<StepState>(["existing", "granted", "skipped", "failed", "not_applicable"]);
const emailStates = new Set<StepState>(["sent", "skipped", "failed", "not_applicable"]);
const nextActions = new Set<NextAction>(["retry_access", "retry_email", "review_email"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function isProvisioningResult(value: unknown, operationId: string): value is ProvisioningResult {
  const payload = record(value);
  const student = record(payload?.student);
  const order = record(payload?.order);
  const access = record(payload?.access);
  const email = record(payload?.email);
  return Boolean(
    payload
    && typeof payload.ok === "boolean"
    && payload.operationId === operationId
    && student && studentStates.has(student.state as StepState)
    && order && orderStates.has(order.state as StepState)
    && email && emailStates.has(email.state as StepState)
    && access && accessStates.has(access.state as StepState)
    && Array.isArray(access.courseSlugs) && access.courseSlugs.length <= 50
    && access.courseSlugs.every((slug) => typeof slug === "string" && /^[a-z0-9][a-z0-9._-]{0,119}$/.test(slug))
    && Array.isArray(payload.nextActions) && payload.nextActions.length <= 3
    && payload.nextActions.every((action) => nextActions.has(action as NextAction))
  );
}

function defaultTrialExpiry() {
  return vietnamDateToLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
}

function initialState(initialOperationId?: string): WizardState {
  return {
    step: 1, mode: "paid", name: "", phone: "", email: "", courseSlugs: [], source: "Admin",
    note: "", trialExpiresAt: defaultTrialExpiry(), sendEmail: true, operationId: initialOperationId ?? crypto.randomUUID(),
  };
}

function ResultCard({ label, state, detail }: { label: string; state: StepState; detail?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-black text-slate-950">{label}</h4>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${stateStyles[state]}`}>{stateLabels[state]}</span>
      </div>
      {detail ? <p className="mt-2 break-words text-xs font-semibold text-slate-500">{detail}</p> : null}
    </article>
  );
}

export function StudentProvisioningWizard({
  courses,
  initialOperationId,
  canReviewEmail = false,
  onBusyChange,
}: {
  courses: Course[];
  initialOperationId?: string;
  canReviewEmail?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(() => initialState(initialOperationId));
  const [result, setResult] = useState<ProvisioningResult | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState<"confirm_delivered" | "confirm_not_delivered" | null>(null);
  const [emailRetryAuthorized, setEmailRetryAuthorized] = useState(false);
  const [isRecoveredResult, setIsRecoveredResult] = useState(false);
  const [isLoadingRecovery, setIsLoadingRecovery] = useState(Boolean(initialOperationId));
  const [validationNow, setValidationNow] = useState(() => Date.now());
  const submittingRef = useRef(false);
  const reviewingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    const timer = window.setInterval(() => setValidationNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const isBusy = isSubmitting || reviewing !== null || isLoadingRecovery;
  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  useEffect(() => {
    if (!initialOperationId) return;
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    const generation = ++generationRef.current;
    async function loadRecovery() {
      try {
        const response = await fetch(`/api/admin/students/provisioning-status?operationId=${encodeURIComponent(initialOperationId!)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        if (generation !== generationRef.current) return;
        if (!response.ok || !isProvisioningResult(payload, initialOperationId!)) {
          const errorPayload = record(payload);
          setMessage(typeof errorPayload?.message === "string" ? errorPayload.message : "Chưa thể tải trạng thái thao tác. Anh có thể nhập lại đúng thông tin để tiếp tục an toàn.");
          return;
        }
        const mode = record(payload)?.mode;
        setResult(payload);
        setIsRecoveredResult(true);
        if (mode === "paid" || mode === "free" || mode === "trial") {
          setState((current) => ({ ...current, mode }));
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError") && generation === generationRef.current) {
          setMessage("Kết nối bị gián đoạn. Chưa tải được trạng thái thao tác cần khôi phục.");
        }
      } finally {
        if (generation === generationRef.current) setIsLoadingRecovery(false);
      }
    }
    void loadRecovery();
    return () => controller.abort();
  }, [initialOperationId]);

  const selectedCourses = courses.filter((course) => state.courseSlugs.includes(course.slug));
  const stepTwoValid = state.name.trim().length > 0
    && /^\d{8,15}$/.test(state.phone.replace(/\D/g, ""))
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())
    && state.courseSlugs.length > 0
    && state.source.trim().length > 0
    && (state.mode !== "trial" || (() => {
      const expiry = vietnamLocalDateTimeToIso(state.trialExpiresAt);
      return expiry !== null && Date.parse(expiry) > validationNow;
    })());

  function chooseMode(mode: ProvisioningMode) {
    setState((current) => ({ ...current, mode, trialExpiresAt: mode === "trial" ? current.trialExpiresAt || defaultTrialExpiry() : current.trialExpiresAt }));
  }

  function toggleCourse(slug: string) {
    setState((current) => ({
      ...current,
      courseSlugs: current.courseSlugs.includes(slug)
        ? current.courseSlugs.filter((value) => value !== slug)
        : [...current.courseSlugs, slug],
    }));
  }

  async function submitOperation() {
    if (submittingRef.current || !stepTwoValid) return;
    submittingRef.current = true;
    onBusyChange?.(true);
    setIsSubmitting(true);
    setMessage("");
    setEmailRetryAuthorized(false);
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    const generation = ++generationRef.current;
    try {
      const response = await fetch("/api/admin/students/grant", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({
          operationId: state.operationId, mode: state.mode, name: state.name, phone: state.phone, email: state.email,
          courseSlugs: state.courseSlugs, source: state.source, ...(state.note.trim() ? { note: state.note } : {}),
          ...(state.mode === "trial" ? { trialExpiresAt: vietnamLocalDateTimeToIso(state.trialExpiresAt) } : {}),
          sendEmail: state.sendEmail,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (generation !== generationRef.current) return;
      if (!isProvisioningResult(payload, state.operationId)) {
        const errorPayload = record(payload);
        setMessage(typeof errorPayload?.message === "string" ? errorPayload.message : "Chưa thể xử lý yêu cầu. Vui lòng thử lại với cùng mã thao tác.");
        return;
      }
      setResult(payload);
      router.refresh();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError") && generation === generationRef.current) {
        setMessage("Kết nối bị gián đoạn. Vui lòng thử lại với cùng mã thao tác để tránh tạo trùng.");
      }
    } finally {
      if (generation === generationRef.current) {
        submittingRef.current = false;
        setIsSubmitting(false);
        onBusyChange?.(false);
      }
    }
  }

  async function resolveEmailReview(resolution: "confirm_delivered" | "confirm_not_delivered") {
    if (!result || reviewingRef.current || !canReviewEmail) return;
    reviewingRef.current = true;
    onBusyChange?.(true);
    setReviewing(resolution);
    setMessage("");
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    const generation = ++generationRef.current;
    try {
      const response = await fetch("/api/admin/students/provisioning-review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ operationId: result.operationId, resolution }),
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; state?: string; message?: string; result?: unknown } | null;
      if (generation !== generationRef.current) return;
      if (!response.ok || !payload?.ok) {
        setMessage(payload?.message ?? "Chưa lưu được quyết định xác nhận email.");
      } else if (resolution === "confirm_delivered" && payload.state === "sent" && isProvisioningResult(payload.result, result.operationId)) {
        setResult(payload.result);
        router.refresh();
      } else if (payload.state === "retry_authorized") {
        if (isProvisioningResult(payload.result, result.operationId)) setResult(payload.result);
        setEmailRetryAuthorized(true);
      } else {
        setMessage("Trạng thái thao tác đã thay đổi. Hãy tải lại danh sách việc cần xử lý trước khi quyết định tiếp.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError") && generation === generationRef.current) {
        setMessage("Kết nối bị gián đoạn. Chưa lưu quyết định xác nhận email.");
      }
    } finally {
      reviewingRef.current = false;
      onBusyChange?.(false);
      if (generation === generationRef.current) setReviewing(null);
    }
  }

  function startAnother() {
    requestRef.current?.abort();
    generationRef.current += 1;
    submittingRef.current = false;
    reviewingRef.current = false;
    setIsSubmitting(false);
    setResult(null);
    setMessage("");
    setEmailRetryAuthorized(false);
    setIsRecoveredResult(false);
    setState(initialState());
  }

  function enterRecoveryDetails() {
    setResult(null);
    setIsRecoveredResult(false);
    setEmailRetryAuthorized(false);
    setMessage("Nhập lại đúng thông tin ban đầu. Hệ thống sẽ đối chiếu fingerprint trước khi tiếp tục cùng mã thao tác.");
    setState((current) => ({ ...current, step: 2 }));
  }

  if (isLoadingRecovery) {
    return <p aria-live="polite" className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-700">Đang tải trạng thái thao tác an toàn...</p>;
  }

  if (result) {
    const canRetryAccess = result.nextActions.includes("retry_access") && !isRecoveredResult;
    const canRetryEmail = (result.nextActions.includes("retry_email") || emailRetryAuthorized) && !isRecoveredResult;
    const needsEmailReview = result.nextActions.includes("review_email") && !emailRetryAuthorized;
    const recoveryNeedsDetails = isRecoveredResult && !result.ok && !needsEmailReview;
    const hasTerminalFailureWithoutAction = !isRecoveredResult && !result.ok && result.nextActions.length === 0;
    const canContinueFailedOperation = hasTerminalFailureWithoutAction && stepTwoValid;
    return (
      <section aria-live="polite" className="grid gap-5">
        <div className={`rounded-2xl p-5 ${result.ok ? "bg-emerald-50" : "bg-amber-50"}`}>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Kết quả thao tác</p>
          <h3 className="mt-2 text-xl font-black text-slate-950">{result.ok ? "Học viên đã sẵn sàng" : "Đã hoàn tất một phần"}</h3>
          <p className="mt-2 break-all font-mono text-xs text-slate-500">Mã thao tác: {result.operationId}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ResultCard label="Tài khoản" state={result.student.state} />
          <ResultCard label="Đơn hàng" state={result.order.state} detail={result.order.orderCode ? `Mã đơn: ${result.order.orderCode}` : undefined} />
          <ResultCard label="Quyền học" state={result.access.state} detail={result.access.courseSlugs.map((slug) => courses.find((course) => course.slug === slug)?.title ?? slug).join(", ")} />
          <ResultCard label="Email" state={result.email.state} />
        </div>

        {needsEmailReview ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h4 className="font-black text-amber-950">Cần anh xác nhận email</h4>
            <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">Hệ thống không thể khẳng định nhà cung cấp đã gửi hay chưa. Không bấm gửi lại trước khi kiểm tra hộp thư/người nhận.</p>
            {canReviewEmail ? <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button className="min-h-11 rounded-full bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50" disabled={Boolean(reviewing)} onClick={() => resolveEmailReview("confirm_delivered")} type="button">
                Xác nhận email đã đến
              </button>
              <button className="min-h-11 rounded-full border border-amber-400 bg-white px-4 text-sm font-black text-amber-950 disabled:opacity-50" disabled={Boolean(reviewing)} onClick={() => resolveEmailReview("confirm_not_delivered")} type="button">
                Xác nhận chưa gửi, cho phép thử đúng 1 lần
              </button>
            </div> : <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm font-bold text-amber-950">Chỉ chủ sở hữu có thể xác nhận trạng thái email. Hãy chuyển mã thao tác này cho owner xử lý.</p>}
          </div>
        ) : null}

        {emailRetryAuthorized ? <p className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-900">Đã cho phép đúng một lần gửi mới. Hãy bấm nút bên dưới để thực hiện.</p> : null}
        {hasTerminalFailureWithoutAction && !stepTwoValid ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Thông tin gốc không còn hợp lệ để chạy lại cùng mã thao tác, thường do hạn học thử đã qua. Mở “Việc cần xử lý” để kiểm tra; không tự đổi hạn vì sẽ làm fingerprint xung đột.</p> : null}
        <div className="flex flex-wrap gap-2">
          {recoveryNeedsDetails ? <button className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white" onClick={enterRecoveryDetails} type="button">Nhập lại thông tin để tiếp tục</button> : null}
          {canContinueFailedOperation ? <button className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-50" disabled={isSubmitting} onClick={submitOperation} type="button">Tiếp tục cùng mã thao tác</button> : null}
          {canRetryAccess ? <button className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-50" disabled={isSubmitting} onClick={submitOperation} type="button">Thử cấp lại quyền</button> : null}
          {canRetryEmail ? <button className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-50" disabled={isSubmitting} onClick={submitOperation} type="button">Gửi lại email 1 lần</button> : null}
          <Link className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-black text-slate-700" href="/admin/viec-can-xu-ly">Mở việc cần xử lý</Link>
          {result.ok ? <button className="min-h-11 rounded-full border border-slate-300 px-5 text-sm font-black text-slate-700" disabled={isSubmitting || Boolean(reviewing)} onClick={startAnother} type="button">Tạo học viên khác</button> : null}
        </div>
        {message ? <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">{message}</p> : null}
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <ol aria-label="Các bước tạo học viên" className="grid grid-cols-3 gap-2">
        {["Loại học viên", "Thông tin & khóa học", "Kiểm tra & thực hiện"].map((label, index) => {
          const number = (index + 1) as WizardStep;
          return <li aria-current={state.step === number ? "step" : undefined} className={`rounded-2xl px-3 py-3 text-xs font-black ${state.step === number ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`} key={label}>{number}. {label}</li>;
        })}
      </ol>

      {state.step === 1 ? (
        <fieldset className="grid gap-3">
          <legend className="text-lg font-black text-slate-950">Anh muốn tạo loại học viên nào?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["paid", "Có phí", "Tạo đơn paid theo giá khóa học, cấp quyền và có thể gửi email."],
              ["free", "Miễn phí", "Không tạo doanh thu; cấp quyền học không giới hạn."],
              ["trial", "Học thử", "Không tạo doanh thu; quyền tự hết hạn theo thời gian đã chọn."],
            ] as const).map(([mode, label, detail]) => (
              <label className={`cursor-pointer rounded-2xl border p-4 ${state.mode === mode ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`} key={mode}>
                <input checked={state.mode === mode} className="sr-only" name="provisioning-mode" onChange={() => chooseMode(mode)} type="radio" />
                <span className="font-black text-slate-950">{label}</span>
                <span className="mt-2 block text-xs font-semibold leading-5 text-slate-600">{detail}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {state.step === 2 ? (
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-black text-slate-700">Họ tên<input autoComplete="name" className={inputClass} onChange={(event) => setState((current) => ({ ...current, name: event.target.value }))} required value={state.name} /></label>
            <label className="grid gap-1.5 text-sm font-black text-slate-700">Số điện thoại<input autoComplete="tel" className={inputClass} inputMode="tel" onChange={(event) => setState((current) => ({ ...current, phone: event.target.value }))} required value={state.phone} /></label>
            <label className="grid gap-1.5 text-sm font-black text-slate-700">Email<input autoComplete="email" className={inputClass} onChange={(event) => setState((current) => ({ ...current, email: event.target.value }))} required type="email" value={state.email} /></label>
            <label className="grid gap-1.5 text-sm font-black text-slate-700">Nguồn<input className={inputClass} onChange={(event) => setState((current) => ({ ...current, source: event.target.value }))} required value={state.source} /></label>
          </div>
          <fieldset>
            <legend className="text-sm font-black text-slate-700">Khóa học</legend>
            <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 sm:grid-cols-2">
              {courses.map((course) => <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-700 hover:bg-slate-50" key={course.slug}><input checked={state.courseSlugs.includes(course.slug)} className="size-4" onChange={() => toggleCourse(course.slug)} type="checkbox" /><span>{course.title}</span></label>)}
            </div>
          </fieldset>
          {state.mode === "trial" ? <label className="grid gap-1.5 text-sm font-black text-slate-700">Hết hạn học thử (giờ Việt Nam)<input className={inputClass} min={vietnamDateToLocalInput(new Date(validationNow))} onChange={(event) => setState((current) => ({ ...current, trialExpiresAt: event.target.value }))} required type="datetime-local" value={state.trialExpiresAt} /></label> : null}
          {state.mode === "paid" ? <p className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-900">Số tiền đơn hàng được tính từ giá thật của khóa học đã chọn. Không nhập số tiền thủ công.</p> : null}
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-700"><input checked={state.sendEmail} className="mt-0.5 size-4" onChange={(event) => setState((current) => ({ ...current, sendEmail: event.target.checked }))} type="checkbox" /><span>Gửi email hướng dẫn sau khi tài khoản và quyền học được xác nhận.</span></label>
          <label className="grid gap-1.5 text-sm font-black text-slate-700">Ghi chú nội bộ (không ghi thông tin đăng nhập)<textarea className={`${inputClass} min-h-24 py-3`} maxLength={500} onChange={(event) => setState((current) => ({ ...current, note: event.target.value }))} value={state.note} /></label>
          {!stepTwoValid ? <p className="text-sm font-bold text-amber-700">Điền đủ họ tên, điện thoại, email, nguồn, khóa học và thời hạn hợp lệ.</p> : null}
        </div>
      ) : null}

      {state.step === 3 ? (
        <div className="grid gap-4">
          <div className="rounded-2xl bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-950">Kiểm tra trước khi thực hiện</h3>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-black text-slate-500">Loại</dt><dd className="mt-1 font-bold text-slate-950">{{ paid: "Có phí", free: "Miễn phí", trial: "Học thử" }[state.mode]}</dd></div>
              <div><dt className="font-black text-slate-500">Học viên</dt><dd className="mt-1 font-bold text-slate-950">{state.name} · {state.email}</dd></div>
              <div><dt className="font-black text-slate-500">Khóa học</dt><dd className="mt-1 font-bold text-slate-950">{selectedCourses.map((course) => course.title).join(", ")}</dd></div>
              <div><dt className="font-black text-slate-500">Email</dt><dd className="mt-1 font-bold text-slate-950">{state.sendEmail ? "Gửi sau khi hoàn tất" : "Không gửi"}</dd></div>
              {state.mode === "trial" ? <div><dt className="font-black text-slate-500">Hết hạn</dt><dd className="mt-1 font-bold text-slate-950">{formatVietnamLocalDateTime(state.trialExpiresAt) ?? "Không hợp lệ"}</dd></div> : null}
              {state.mode === "paid" ? <div><dt className="font-black text-slate-500">Đơn hàng</dt><dd className="mt-1 font-bold text-slate-950">Paid · giá theo cấu hình khóa học</dd></div> : null}
            </dl>
          </div>
          <p className="text-xs font-semibold text-slate-500">Mỗi lần mở form có một mã thao tác riêng. Nếu mạng lỗi, hệ thống dùng lại mã này để tránh tạo trùng.</p>
          <button className="min-h-12 rounded-full bg-slate-950 px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={isSubmitting} onClick={submitOperation} type="button">{isSubmitting ? "Đang tạo học viên..." : "Tạo học viên"}</button>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button className="min-h-11 rounded-full border border-slate-300 px-5 text-sm font-black text-slate-700 disabled:opacity-40" disabled={state.step === 1 || isSubmitting} onClick={() => setState((current) => ({ ...current, step: (current.step - 1) as WizardStep }))} type="button">Quay lại</button>
        {state.step < 3 ? <button className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-40" disabled={(state.step === 2 && !stepTwoValid) || isSubmitting} onClick={() => setState((current) => ({ ...current, step: (current.step + 1) as WizardStep }))} type="button">Tiếp tục</button> : null}
      </div>
      {message ? <p aria-live="polite" className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">{message}</p> : null}
    </section>
  );
}

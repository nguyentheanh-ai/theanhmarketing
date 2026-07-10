"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { GitBranch, KeyRound, Mail, ShieldCheck, Tags } from "lucide-react";

import {
  CrmPaginationBar,
  FilterBar,
  IconButton,
  KpiCard,
  PageHeader,
  StatusBadge,
} from "@/components/crm-v2";
import { normalizePhone } from "@/lib/crm-v2/normalize";
import type { CrmLeadBulkAction, CrmLeadBulkActionPayload, CrmListQuery, CrmUnifiedCustomerRow, KpiMetric } from "@/lib/crm-v2/types";

type StageRow = { label: string; value: number; tone: "blue" | "green" | "orange" | "purple" };
type CourseOption = { label: string; value: string };

type LeadsPageClientProps = {
  courseOptions: CourseOption[];
  query: CrmListQuery;
  rows: CrmUnifiedCustomerRow[];
  page: number;
  pageSize: 10 | 20 | 50;
  total: number;
  pageCount: number;
  stageRows: StageRow[];
};

const bulkActionOptions: Array<{ value: CrmLeadBulkAction; label: string }> = [
  { value: "assign_owner", label: "Gán sale" },
  { value: "update_stage", label: "Cập nhật stage" },
  { value: "add_tag", label: "Thêm tag" },
  { value: "send_email", label: "Gửi email" },
  { value: "add_workflow", label: "Thêm workflow" },
  { value: "export_csv", label: "Xuất CSV" },
];

const stageOptions = ["new", "not_contacted", "consulting", "high_intent", "pending_payment", "paid", "disqualified"] as const;
const stageOptionLabels: Record<(typeof stageOptions)[number], string> = {
  new: "Mới",
  not_contacted: "Chưa liên hệ",
  consulting: "Đang tư vấn",
  high_intent: "Quan tâm cao",
  pending_payment: "Chờ thanh toán",
  paid: "Đã thanh toán",
  disqualified: "Không phù hợp",
};

const pipelineColumns = [
  { key: "date", label: "Thời gian", width: "138px" },
  { key: "name", label: "Tên khách", width: "210px" },
  { key: "phone", label: "SĐT", width: "150px" },
  { key: "zalo", label: "Zalo", width: "82px" },
  { key: "course", label: "Khóa học quan tâm", width: "260px" },
  { key: "email", label: "Mail", width: "230px" },
  { key: "paymentStatus", label: "Tình trạng thanh toán", width: "190px" },
  { key: "latestActivity", label: "Hoạt động gần nhất", width: "240px" },
] as const;

function uniqueOptions(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).map((value) => ({
    label: value,
    value,
  }));
}

function paymentTone(status: string): "blue" | "green" | "orange" | "purple" | "red" | "slate" {
  const value = status.toLowerCase();
  if (["paid", "success", "completed"].includes(value)) return "green";
  if (value.includes("pending") || value.includes("wait")) return "orange";
  if (value.includes("fail") || value.includes("cancel")) return "red";
  return "slate";
}

function getZaloPhone(phone?: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return normalized.replace(/\D/g, "");
}

function hasZaloMessaged(row: CrmUnifiedCustomerRow) {
  const values = [row.latestActivity, row.emailStatus, row.sourceDetail, ...row.tags].join(" ").toLowerCase();
  return values.includes("zalo") || values.includes("da-nhan-zalo") || values.includes("da nhan zalo");
}

function openZaloConversation(zaloPhone: string) {
  const deepLink = `zalo://conversation?phone=${zaloPhone}`;
  const fallbackLink = `https://zalo.me/${zaloPhone}`;
  window.open(deepLink, "_self");
  window.setTimeout(() => {
    if (document.visibilityState !== "hidden") {
      window.open(fallbackLink, "_blank", "noopener,noreferrer");
    }
  }, 900);
}

export default function LeadsPageClient({ courseOptions, query, rows, page, pageSize, total, pageCount, stageRows }: LeadsPageClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string>(rows[0]?.id ?? "");
  const [action, setAction] = useState<CrmLeadBulkAction>("assign_owner");
  const [owner, setOwner] = useState("");
  const [stage, setStage] = useState<(typeof stageOptions)[number]>("new");
  const [tags, setTags] = useState("");
  const [subject, setSubject] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [filename, setFilename] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [zaloPendingIds, setZaloPendingIds] = useState<string[]>([]);
  const [zaloMessagedIds, setZaloMessagedIds] = useState<string[]>([]);

  const sourceOptions = useMemo(() => uniqueOptions(rows.map((row) => row.normalizedSource || row.source)), [rows]);
  const courseFilterOptions = useMemo(
    () => Array.from(new Map(rows.map((row) => [row.courseSlug || row.course, { label: row.course, value: row.courseSlug || row.course }])).values()).filter((option) => Boolean(option.value)),
    [rows],
  );
  const ownerOptions = useMemo(
    () => Array.from(new Map(rows.filter((row) => row.ownerId).map((row) => [row.ownerId || row.owner, { label: row.owner, value: row.ownerId || row.owner }])).values()),
    [rows],
  );
  const metricCards: KpiMetric[] = useMemo(
    () => stageRows.map((row) => ({ label: row.label, value: String(row.value), tone: row.tone, series: [row.value, row.value + 1, row.value + 2] })),
    [stageRows],
  );

  function getPayload(): CrmLeadBulkActionPayload | null {
    if (!selectedIds.length) return null;
    const base = { leadIds: selectedIds };
    if (action === "assign_owner") return owner.trim() ? { action, owner: owner.trim(), ...base } : null;
    if (action === "update_stage") return { action, stage, ...base };
    if (action === "add_tag") {
      const tagList = tags.split(",").map((value) => value.trim()).filter(Boolean);
      return tagList.length ? { action, tags: tagList, ...base } : null;
    }
    if (action === "send_email") return { action, subject: subject.trim() || "CRM v2 follow-up email", ...base };
    if (action === "add_workflow") return workflowId.trim() ? { action, workflowId: workflowId.trim(), ...base } : null;
    return { action, filename: filename.trim() || undefined, ...base };
  }

  async function handleSubmit() {
    const payload = getPayload();
    if (!payload) {
      setStatusMessage("Thiếu dữ liệu bắt buộc cho action.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/admin/crm-v2/leads/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (payload.action === "export_csv" && response.ok) {
        const csv = await response.text();
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename.trim() || `crm-v2-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(objectUrl);
        setStatusMessage(`Đã tải CSV cho ${selectedIds.length} dòng.`);
        return;
      }
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setStatusMessage(result?.message ? `Lỗi: ${result.message}` : `Request failed: ${response.status}`);
        return;
      }
      setStatusMessage(`Hoàn thành: updated=${Number(result.affected ?? 0)}, skipped=${Number(result.skipped ?? 0)}, failed=${Number(result.failed ?? 0)}`);
      setSelectedIds([]);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleZaloClick(row: CrmUnifiedCustomerRow) {
    const zaloPhone = getZaloPhone(row.phone);
    if (!zaloPhone) {
      setStatusMessage("Lead nay chua co SDT de mo Zalo.");
      return;
    }

    openZaloConversation(zaloPhone);
    setZaloMessagedIds((current) => (current.includes(row.id) ? current : [...current, row.id]));
    setStatusMessage("Da mo Zalo. Dang cap nhat lead: Da nhan Zalo.");
    setZaloPendingIds((current) => [...current, row.id]);
    try {
      const response = await fetch("/api/admin/crm-v2/leads/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ action: "mark_zalo_messaged", leadIds: [row.id], phone: row.phone, email: row.email, orderCode: row.orderCode }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setStatusMessage(result?.message ? `Da mo Zalo. Can kiem tra lai cap nhat CRM: ${result.message}` : `Da mo Zalo. CRM update failed: ${response.status}`);
        return;
      }
      setStatusMessage("Da cap nhat lead: Da nhan Zalo.");
      router.refresh();
    } finally {
      setZaloPendingIds((current) => current.filter((id) => id !== row.id));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Pipeline"
        title="Leads & Pipeline"
        actions={
          <>
            <IconButton href="/admin/crm-v2/leads" label="Làm mới"><GitBranch className="h-4 w-4" /></IconButton>
            <IconButton href="/admin/crm-v2/email?source=leads" label="Email nhanh"><Mail className="h-4 w-4" /></IconButton>
            <IconButton href="/admin/crm-v2/segments?source=leads" label="Thẻ"><Tags className="h-4 w-4" /></IconButton>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {metricCards.map((metric) => <KpiCard key={metric.label} metric={metric} />)}
      </div>

      <FilterBar
        items={[
          { label: "Nguồn", value: query.filters?.source, param: "source", options: sourceOptions },
          { label: "Khóa học", value: query.filters?.course, param: "course", options: courseFilterOptions },
          { label: "Owner sale", value: query.filters?.owner, param: "owner", options: ownerOptions },
          { label: "Stage", value: query.filters?.stage, param: "stage", options: stageOptions.map((value) => ({ value, label: stageOptionLabels[value] })) },
          { label: "Thanh toán", value: query.filters?.status, param: "status", options: uniqueOptions(rows.map((row) => row.paymentStatus)) },
        ]}
      />
      <CrmPaginationBar basePath="/admin/crm-v2/leads" query={query} page={page} pageSize={pageSize} pageCount={pageCount} total={total} />

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="text-sm font-semibold text-slate-700">
            Đã chọn: <span className="font-black">{selectedIds.length}</span> / {total}
          </div>
          <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
            <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={action} onChange={(event) => setAction(event.target.value as CrmLeadBulkAction)}>
              {bulkActionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {action === "assign_owner" ? <input className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="Nhập tên sale" value={owner} onChange={(event) => setOwner(event.target.value)} /> : null}
            {action === "update_stage" ? (
              <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={stage} onChange={(event) => setStage(event.target.value as (typeof stageOptions)[number])}>
                {stageOptions.map((stageOption) => <option key={stageOption} value={stageOption}>{stageOptionLabels[stageOption]}</option>)}
              </select>
            ) : null}
            {action === "add_tag" ? <input className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="Tag cách nhau dấu phẩy" value={tags} onChange={(event) => setTags(event.target.value)} /> : null}
            {action === "send_email" ? <input className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="Tiêu đề email" value={subject} onChange={(event) => setSubject(event.target.value)} /> : null}
            {action === "add_workflow" ? <input className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="workflowId" value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} /> : null}
            {action === "export_csv" ? <input className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="crm-v2-leads.csv" value={filename} onChange={(event) => setFilename(event.target.value)} /> : null}
            <button className="inline-flex h-9 min-w-28 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-bold text-white disabled:opacity-50" type="submit" disabled={isSaving || selectedIds.length === 0}>
              {isSaving ? "Đang xử lý..." : "Thực hiện"}
            </button>
          </form>
        </div>
        {statusMessage ? <div className={`mb-3 rounded-lg border border-slate-200 px-3 py-2 text-sm ${statusMessage.includes("Lỗi") ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{statusMessage}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                <th className="w-10 px-2 py-3" />
                {pipelineColumns.map((column) => (
                  <th className="px-3 py-3" key={column.key} style={{ width: column.width }}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expanded = expandedRowId === row.id;
                const selected = selectedIds.includes(row.id);
                return (
                  <Fragment key={row.id}>
                    <tr className="border-b border-slate-100 align-top hover:bg-slate-50">
                      <td className="px-2 py-3">
                        <input aria-label={`Chọn ${row.name}`} checked={selected} type="checkbox" onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} />
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-700">{row.date}</td>
                      <td className="px-3 py-3">
                        <button className="text-left font-black text-blue-700 hover:underline" type="button" onClick={() => setExpandedRowId(expanded ? "" : row.id)}>{row.name}</button>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{row.phone || "-"}</td>
                      <td className="px-3 py-3">
                        <button
                          aria-label={`Nhắn Zalo cho ${row.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-sm font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={!getZaloPhone(row.phone) || zaloPendingIds.includes(row.id)}
                          title="Nhắn Zalo"
                          type="button"
                          onClick={() => void handleZaloClick(row)}
                        >
                          Z
                        </button>
                      </td>
                      <td className="px-3 py-3"><StatusBadge tone="blue">{row.courseShort}</StatusBadge></td>
                      <td className="px-3 py-3"><span className="block truncate font-semibold text-slate-600">{row.email || "-"}</span></td>
                      <td className="px-3 py-3"><StatusBadge tone={paymentTone(row.paymentStatus)}>{row.paymentStatus}</StatusBadge></td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{row.latestActivity}</td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td />
                        <td className="px-3 py-3 text-xs font-bold text-slate-600" colSpan={8}>
                          <div className="grid gap-2 md:grid-cols-4">
                            <Detail label="Nguồn" value={`${row.normalizedSource} (${row.sourceDetail})`} />
                            <Detail label="Owner" value={row.owner} />
                            <Detail label="Stage" value={stageOptionLabels[row.stage]} />
                            <Detail label="Mã đơn" value={row.orderCode || "-"} />
                            <Detail label="Giá trị" value={row.amount ? `${row.amount.toLocaleString("vi-VN")}đ` : "-"} />
                            <Detail label="Lead score" value={String(row.leadScore)} />
                            <Detail label="Email status" value={row.emailStatus} />
                            <Detail label="Zalo" value={zaloMessagedIds.includes(row.id) || hasZaloMessaged(row) ? "Đã nhắn Zalo" : "Chưa nhắn Zalo"} />
                            <Detail label="Khóa học đầy đủ" value={row.course} />
                          </div>
                          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                            <CustomerLearningActions courseOptions={courseOptions} row={row} onDone={() => router.refresh()} />
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="text-[10px] font-black uppercase text-slate-400">Hồ sơ</div>
                            <Link className="font-black text-blue-700 hover:underline" href={`/admin/crm-v2/leads/${encodeURIComponent(row.contactId || row.id)}`}>Mở hồ sơ 360</Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CustomerLearningActions({
  courseOptions,
  onDone,
  row,
}: {
  courseOptions: CourseOption[];
  onDone: () => void;
  row: CrmUnifiedCustomerRow;
}) {
  const defaultCourseSlugs = courseOptions.some((course) => course.value === row.courseSlug)
    ? [row.courseSlug as string]
    : courseOptions.slice(0, 1).map((course) => course.value);
  const [selectedCourseSlugs, setSelectedCourseSlugs] = useState<string[]>(defaultCourseSlugs);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState<"grant" | "revoke" | "password" | null>(null);
  const canManage = Boolean(row.email);

  function toggleCourse(slug: string) {
    setSelectedCourseSlugs((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  async function updateAccess({ action }: { action: "grant" | "revoke" }) {
    setMessage("");

    if (!canManage) {
      setMessage("Khách này chưa có email nên chưa thể cấp quyền học viên.");
      return;
    }

    if (selectedCourseSlugs.length === 0) {
      setMessage("Chọn ít nhất một khóa học.");
      return;
    }

    setIsSaving(action);
    try {
      const response = await fetch("/api/admin/students/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          courseSlugs: selectedCourseSlugs,
          email: row.email,
          name: row.name,
          phone: row.phone,
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? (response.ok ? "Đã cập nhật quyền học viên." : `Không cập nhật được quyền học viên: ${response.status}`));

      if (response.ok && result?.ok) {
        onDone();
      }
    } finally {
      setIsSaving(null);
    }
  }

  async function resendPassword() {
    setMessage("");

    if (!canManage) {
      setMessage("Khách này chưa có email nên chưa thể gửi lại mật khẩu.");
      return;
    }

    if (!window.confirm(`Set mật khẩu mới và gửi email đăng nhập cho ${row.email}?`)) {
      return;
    }

    setIsSaving("password");
    try {
      const response = await fetch("/api/admin/students/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseSlugs: selectedCourseSlugs,
          email: row.email,
          name: row.name,
          phone: row.phone,
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? (response.ok ? "Đã gửi lại mật khẩu học viên." : `Không gửi lại được mật khẩu: ${response.status}`));

      if (response.ok && result?.ok) {
        onDone();
      }
    } finally {
      setIsSaving(null);
    }
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase text-blue-600">Quyền học viên</div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{row.email || "Chưa có email"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canManage || selectedCourseSlugs.length === 0 || Boolean(isSaving)}
            type="button"
            onClick={() => void updateAccess({ action: "grant" })}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {isSaving === "grant" ? "Đang cấp" : "Cấp quyền"}
          </button>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 text-xs font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canManage || selectedCourseSlugs.length === 0 || Boolean(isSaving)}
            type="button"
            onClick={() => void updateAccess({ action: "revoke" })}
          >
            Thu quyền
          </button>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 text-xs font-black text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canManage || Boolean(isSaving)}
            type="button"
            onClick={() => void resendPassword()}
          >
            <KeyRound className="h-3.5 w-3.5" />
            {isSaving === "password" ? "Đang gửi" : "Gửi lại mật khẩu"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid max-h-32 gap-1.5 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-2 md:grid-cols-2">
        {courseOptions.map((course) => (
          <label key={course.value} className="flex min-w-0 items-center gap-2 rounded bg-white px-2 py-1.5 text-xs font-bold text-slate-700">
            <input
              checked={selectedCourseSlugs.includes(course.value)}
              className="size-4 shrink-0 rounded border-slate-300 text-blue-600"
              type="checkbox"
              onChange={() => toggleCourse(course.value)}
            />
            <span className="truncate">{course.label}</span>
          </label>
        ))}
      </div>

      {message ? <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{message}</p> : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] font-black uppercase text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-slate-700">{value}</div>
    </div>
  );
}

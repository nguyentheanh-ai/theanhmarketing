import Link from "next/link";
import {
  CrmDataTable,
  ErrorState,
  IconButton,
  InsightRow,
  PageHeader,
  RightInsightPanel,
  StatusBadge,
  Timeline,
  ChartCard,
} from "@/components/crm-v2";
import { getCrmV2LeadProfile } from "@/lib/crm-v2/data";
import type {
  CrmEvent,
  CrmOrderRow,
  CrmProfileAutomationRun,
  CrmProfileEmailHistory,
  CrmProfileNote,
  CrmProfileTask,
  CrmStudentRow,
  CrmTableColumn,
} from "@/lib/crm-v2/types";
import { Activity, Calendar, type LucideIcon, Mail, MessageSquare, ShoppingCart, UserRound, Workflow } from "lucide-react";

type TabId = "overview" | "timeline" | "notes" | "orders" | "students" | "email" | "automation" | "tasks";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type TabDef = {
  id: TabId;
  label: string;
  icon: LucideIcon;
};

const tabs: TabDef[] = [
  { id: "overview", label: "Tổng quan", icon: UserRound },
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "notes", label: "Ghi chu", icon: MessageSquare },
  { id: "orders", label: "Đơn hàng", icon: ShoppingCart },
  { id: "students", label: "Học viên", icon: UserRound },
  { id: "email", label: "Email", icon: Mail },
  { id: "automation", label: "Automation", icon: Workflow },
  { id: "tasks", label: "Task", icon: Calendar },
];

const studentColumns: CrmTableColumn<CrmStudentRow>[] = [
  { key: "student", label: "Học viên" },
  { key: "course", label: "Khóa học" },
  { key: "status", label: "Trang thai" },
  { key: "progress", label: "Tien do" },
  { key: "lastLearned", label: "Lan hoc gan nhat" },
  { key: "engagement", label: "Tuong tac" },
  { key: "upsell", label: "Upsell" },
];

const orderColumns: CrmTableColumn<CrmOrderRow>[] = [
  { key: "orderCode", label: "Ma don" },
  { key: "product", label: "Khóa học" },
  {
    key: "value",
    label: "Gia tri",
    render: (row) => <span>{Number(row.value).toLocaleString("vi-VN")}đ</span>,
  },
  {
    key: "discount",
    label: "Giam gia",
    render: (row) => <span>{Number(row.discount).toLocaleString("vi-VN")}đ</span>,
  },
  { key: "payment", label: "Thanh toán" },
  {
    key: "status",
    label: "Trang thai",
    render: (row) => <StatusBadge tone="blue">{row.status}</StatusBadge>,
  },
  { key: "source", label: "Nguồn" },
];

const noteColumns: CrmTableColumn<CrmProfileNote>[] = [
  { key: "source", label: "Nguồn" },
  { key: "body", label: "Noi dung" },
  { key: "author", label: "Nguoi tao" },
  { key: "createdAt", label: "Tạo lúc" },
];

const emailColumns: CrmTableColumn<CrmProfileEmailHistory>[] = [
  { key: "campaign", label: "Chiến dịch", render: (row) => <span>{row.campaign}</span> },
  { key: "subject", label: "Subject", render: (row) => <span>{row.subject}</span> },
  { key: "status", label: "Trang thai", render: (row) => <StatusBadge tone="blue">{row.status}</StatusBadge> },
  { key: "sent", label: "Gửi", render: (row) => <span>{row.sent}</span> },
  { key: "opened", label: "Mo", render: (row) => <span>{row.opened}</span> },
  { key: "clicked", label: "Click", render: (row) => <span>{row.clicked}</span> },
  { key: "channel", label: "Kenh", render: (row) => <span>{row.channel}</span> },
];

const automationColumns: CrmTableColumn<CrmProfileAutomationRun>[] = [
  { key: "workflow", label: "Workflow" },
  { key: "status", label: "Trang thai", render: (row) => <StatusBadge tone="blue">{row.status}</StatusBadge> },
  { key: "step", label: "Buoc hien tai" },
  { key: "started", label: "Bat dau" },
  { key: "finished", label: "Ket thuc" },
];

const taskColumns: CrmTableColumn<CrmProfileTask>[] = [
  { key: "title", label: "Tieu de" },
  {
    key: "status",
    label: "Trang thai",
    render: (row) => (
      <StatusBadge tone={row.status === "completed" ? "green" : row.status === "in_progress" ? "blue" : "slate"}>
        {row.status}
      </StatusBadge>
    ),
  },
  {
    key: "priority",
    label: "Uu tien",
    render: (row) => (
      <StatusBadge tone={row.priority === "urgent" ? "red" : row.priority === "high" ? "orange" : "blue"}>{row.priority}</StatusBadge>
    ),
  },
  { key: "due", label: "Han" },
  { key: "owner", label: "Owner" },
];

function createTabHref(leadId: string, tab: TabId) {
  if (tab === "overview") return `/admin/crm-v2/leads/${encodeURIComponent(leadId)}`;
  return `/admin/crm-v2/leads/${encodeURIComponent(leadId)}?tab=${tab}`;
}

function parseTab(raw: string | string[] | undefined): TabId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "overview";
  return tabs.some((tab) => tab.id === value) ? (value as TabId) : "overview";
}

export default async function CrmV2LeadProfilePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const activeTab = parseTab(rawSearchParams?.tab);
  const profile = await getCrmV2LeadProfile(id);

  const hasData = Boolean(profile.contact?.id);
  if (!hasData) {
    return <ErrorState title="Không lấy được dữ liệu lead" description="Kiểm tra lại ID hoặc bật CRM v2 trước khi truy cập." />;
  }

  const timelineEvents: CrmEvent[] = profile.events;
  const notes: CrmProfileNote[] = profile.notes;
  const orders: CrmOrderRow[] = profile.orders;
  const students: CrmStudentRow[] = profile.students;
  const emails: CrmProfileEmailHistory[] = profile.emailHistory;
  const automations: CrmProfileAutomationRun[] = profile.automationRuns;
  const tasks: CrmProfileTask[] = profile.tasks;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Contact 360"
        title="Hồ sơ liên hệ 360°"
        actions={
          <>
            <IconButton href={`/admin/crm-v2/email?contactId=${encodeURIComponent(profile.contact.id)}`} label="Gửi email">
              <Mail className="h-4 w-4" />
            </IconButton>
            <IconButton href={`/admin/crm-v2/leads/${encodeURIComponent(profile.contact.id)}?tab=tasks`} label="Them task">
              <Calendar className="h-4 w-4" />
            </IconButton>
            <IconButton href={`/admin/crm-v2/automation?leadId=${encodeURIComponent(profile.contact.id)}`} label="Gửi remarketing">
              <Mail className="h-4 w-4" />
            </IconButton>
          </>
        }
      />

      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[280px_minmax(0,1fr)_340px]">
        <ChartCard title="Ho so">
          <div className="space-y-3">
            <div className="text-xl font-black text-slate-950">{profile.contact.fullName}</div>
            <InsightRow label="Email" value={profile.contact.email ?? "Không có"} tone="blue" />
            <InsightRow label="Phone" value={profile.contact.phone ?? "Không có"} tone="blue" />
            <InsightRow label="Nguồn" value={profile.contact.source ?? "unknown"} tone="slate" />
            <InsightRow label="Owner sale" value={profile.contact.ownerName ?? "Chưa gán"} tone="purple" />
            <InsightRow label="Lead score" value={`${profile.contact.leadScore}`} tone="green" />
            <InsightRow label="Lifecycle" value={profile.contact.lifecycleStage} tone="blue" />
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tag</p>
              <div className="flex flex-wrap gap-2">
                {profile.contact.tags.length ? (
                  profile.contact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Chưa có tag</span>
                )}
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Ho so chi tiet · Tabs">
          <div className="mb-4 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={createTabHref(profile.contact.id, tab.id)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <h3 className="mb-3 font-bold text-slate-700">Thông tin lead</h3>
                  <div className="space-y-2 text-sm">
                    <InsightRow label="Lead ID" value={profile.lead.id} tone="blue" />
                    <InsightRow label="Ma khach hang" value={profile.lead.contactId || "N/A"} tone="blue" />
                    <InsightRow label="Trang thai" value={profile.lead.stage} tone="purple" />
                    <InsightRow label="Email status" value={profile.lead.emailStatus} tone="green" />
                    <InsightRow label="Khoi luong mua" value={profile.lead.course} tone="orange" />
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <h3 className="mb-3 font-bold text-slate-700">Tổng quan</h3>
                  <div className="space-y-2 text-sm">
                    <InsightRow
                      label="Tổng điểm"
                      value={`${profile.lead.potentialValue.toLocaleString("vi-VN")}đ`}
                      tone="blue"
                    />
                    <InsightRow label="Lan cham gan nhat" value={profile.lead.lastTouch} tone="orange" />
                    <InsightRow label="Next action" value={profile.lead.nextAction} tone="purple" />
                    <InsightRow
                      label="Consent"
                      value={profile.contact.marketingConsent ? "Cho phép marketing" : "Không cho phép marketing"}
                      tone={profile.contact.marketingConsent ? "green" : "red"}
                    />
                    <InsightRow
                      label="Suppression status"
                      value={profile.contact.unsubscribedAt || profile.contact.bounceStatus || profile.contact.complainedAt ? "Blocked" : "Open"}
                      tone="blue"
                    />
                  </div>
                </div>
              </div>

              <Timeline events={timelineEvents} />
            </div>
          )}

          {activeTab === "timeline" && <Timeline events={timelineEvents} />}
          {activeTab === "notes" && (
            <CrmDataTable rows={notes} columns={noteColumns} rowIdKey="id" selectable={false} emptyLabel="Chưa có ghi chú" />
          )}

          {activeTab === "orders" && <CrmDataTable rows={orders} rowIdKey="id" columns={orderColumns} />}

          {activeTab === "students" && (
            <CrmDataTable
              rows={students}
              columns={studentColumns}
              rowIdKey="id"
              selectable={false}
              emptyLabel="Chưa có bản ghi học viên"
            />
          )}

          {activeTab === "email" && (
            <CrmDataTable
              rows={emails}
              columns={emailColumns}
              rowIdKey="id"
              selectable={false}
              emptyLabel="Chưa có email"
            />
          )}

          {activeTab === "automation" && <CrmDataTable rows={automations} rowIdKey="id" columns={automationColumns} />}

          {activeTab === "tasks" && <CrmDataTable rows={tasks} rowIdKey="id" columns={taskColumns} emptyLabel="Chưa có task" />}
        </ChartCard>

        <RightInsightPanel title="Gợi ý chuyển đổi">
          <InsightRow
            label="Kha nang chuyen doi"
            value={profile.lead.stage === "paid" ? "Won" : "Cần nuôi"}
            tone={profile.lead.stage === "paid" ? "green" : "purple"}
          />
          <InsightRow label="Email engagement" value={profile.lead.emailStatus} tone="blue" />
          <InsightRow label="Workflow đang chạy" value={automations[0]?.workflow ?? "Chưa có"} tone="green" />
          <InsightRow label="Task sắp tới" value={tasks[0]?.title ?? "Chưa có"} tone="orange" />
          <InsightRow label="Đơn hàng gần đây" value={orders[0]?.orderCode ?? "Chưa có"} tone="blue" />
          <InsightRow label="Su kien gan day" value={`${timelineEvents.length} event`} tone="slate" />
          <InsightRow
            label="Học viên"
            value={students.length ? `${students.length} hồ sơ` : "Chưa có"}
            tone="green"
          />
        </RightInsightPanel>
      </div>
    </div>
  );
}

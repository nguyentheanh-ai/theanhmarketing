import type { ReactNode } from "react";

export type CrmStage =
  | "new"
  | "not_contacted"
  | "consulting"
  | "high_intent"
  | "pending_payment"
  | "paid"
  | "disqualified";

export type CrmStatus = "active" | "draft" | "paused" | "archived" | "failed" | "success" | "pending" | "open";

export type SortDirection = "asc" | "desc";

export type CrmListFilters = {
  stage?: string;
  source?: string;
  owner?: string;
  course?: string;
  status?: string;
  role?: string;
};

export type CrmListQuery = {
  page: number;
  pageSize: 10 | 20 | 50;
  search?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
  range: "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";
  dateFrom?: string;
  dateTo?: string;
  filters?: CrmListFilters;
};

export type CrmListResult<T> = {
  rows: T[];
  page: number;
  pageSize: 10 | 20 | 50;
  total: number;
  pageCount: number;
};

export type KpiMetric = {
  label: string;
  value: string;
  delta?: string;
  tone?: "blue" | "green" | "orange" | "purple" | "red" | "slate";
  series?: number[];
};

export type CrmContact = {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  source?: string;
  ownerName?: string;
  lifecycleStage: string;
  leadScore: number;
  tags: string[];
  courses: string[];
  marketingConsent?: boolean;
  unsubscribedAt?: string | null;
  bounceStatus?: string | null;
  complainedAt?: string | null;
};

export type CrmSegmentRuleSummary = {
  source: string;
  operator: string;
  value: string;
};

export type CrmSegmentRow = {
  id: string;
  name: string;
  condition: string;
  size: number;
  goal: string;
  channel: string;
  updated: string;
  status: string;
};

export type CrmLeadRow = {
  id: string;
  contactId: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  course: string;
  courseSlug?: string;
  leadScore: number;
  owner: string;
  ownerId?: string;
  stage: CrmStage;
  emailStatus: string;
  lastTouch: string;
  nextAction: string;
  potentialValue: number;
  createdAt: string;
  tags: string[];
};

export type CrmUnifiedCustomerRow = {
  id: string;
  contactId: string;
  date: string;
  name: string;
  phone?: string;
  email?: string;
  courseShort: string;
  course: string;
  courseSlug?: string;
  paymentStatus: string;
  latestActivity: string;
  latestActivityAt?: string;
  source: string;
  sourceDetail: string;
  normalizedSource: string;
  owner: string;
  ownerId?: string;
  leadScore: number;
  stage: CrmStage;
  orderCode?: string;
  amount: number;
  emailStatus: string;
  tags: string[];
};

export type CrmOrderRow = {
  id: string;
  orderCode: string;
  contactId?: string;
  customer: string;
  product: string;
  courseSlug?: string;
  value: number;
  discount: number;
  payment: string;
  status: string;
  source: string;
  owner: string;
  ownerId?: string;
  created: string;
  due: string;
};

export type CrmStudentRow = {
  id: string;
  contactId?: string;
  student: string;
  course: string;
  courseSlug?: string;
  status: string;
  progress: string;
  lastLearned: string;
  engagement: string;
  upsell: string;
  owner: string;
  ownerId?: string;
  emailCare: string;
};

export type CrmTeamMember = {
  id: string;
  member: string;
  role: string;
  pipeline: string;
  tasks: string;
  sla: string;
  status: string;
};

export type CrmIntegrationRow = {
  id: string;
  provider: string;
  type: string;
  status: string;
  lastSync: string;
  health: "ready" | "mock" | "error" | "unknown";
};

export type CrmAutomationWorkflowRow = {
  id: string;
  name: string;
  status: "active" | "draft" | "paused" | "archived" | "error" | "success" | "pending" | "open";
  runs: string;
  runsNumeric: number;
  updated: string;
};

export type CrmEmailCampaignRow = {
  id: string;
  name: string;
  segmentId?: string;
  templateId?: string;
  subject?: string;
  preheader?: string;
  segment: string;
  type: string;
  status: string;
  sendTime: string;
  scheduledAt?: string;
  audienceTotal?: number;
  sendable?: number;
  suppressed?: number;
  missingEmail?: number;
  openRate: string;
  clickRate: string;
  conversion: string;
  revenue: number;
  owner: string;
};

export type CrmCourseOption = {
  label: string;
  value: string;
  paidOrders: number;
  pendingOrders: number;
  revenue: number;
};

export type CrmReportAttributionRow = {
  id: string;
  channel: string;
  leads: number;
  mql: number;
  paid: number;
  cr: string;
  revenue: number;
  cac: string;
  roi: string;
  emailRevenue: number;
  note: string;
};

export type CrmEvent = {
  id: string;
  type: string;
  title: string;
  description?: string;
  occurredAt: string;
  occurredAtIso?: string;
  source?: string;
  tone?: "blue" | "green" | "orange" | "purple" | "red" | "slate";
};

export type CrmProfileNote = {
  id: string;
  source: "lead_note" | "student_note";
  author: string;
  body: string;
  createdAt: string;
};

export type CrmProfileEmailHistory = {
  id: string;
  campaign: string;
  subject: string;
  status: string;
  sent: string;
  opened: string;
  clicked: string;
  channel: string;
  campaignStatus?: string;
};

export type CrmProfileAutomationRun = {
  id: string;
  workflow: string;
  status: "pending" | "running" | "waiting" | "success" | "failed" | "skipped";
  step: string;
  started: string;
  finished: string;
};

export type CrmProfileTask = {
  id: string;
  title: string;
  status: "open" | "in_progress" | "blocked" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  due: string;
  owner: string;
  leadId?: string;
};

export type CrmLeadProfile = {
  contact: CrmContact;
  lead: CrmLeadRow;
  events: CrmEvent[];
  orders: CrmOrderRow[];
  students: CrmStudentRow[];
  notes: CrmProfileNote[];
  emailHistory: CrmProfileEmailHistory[];
  automationRuns: CrmProfileAutomationRun[];
  tasks: CrmProfileTask[];
};

export type CrmTableColumn<T> = {
  key: keyof T | string;
  label: string;
  align?: "left" | "right" | "center";
  width?: string;
  render?: (row: T) => ReactNode;
};

export type CrmDashboardData = {
  kpis: KpiMetric[];
  funnel: Array<{ label: string; value: number; tone: string }>;
  revenue: Array<{ label: string; value: number; displayValue?: string }>;
  sources: Array<{ label: string; value: number; tone: string }>;
  emailPerformance: Array<{ label: string; open: number; click: number }>;
  activity: CrmEvent[];
  tasks: Array<{ title: string; owner: string; due: string; tone: string }>;
  campaigns: Array<{ name: string; status: string; metric: string }>;
  workflows: Array<{ name: string; status: string; runs: string }>;
  courses: Array<{ name: string; revenue: string; paid: number }>;
  reportSummary?: {
    newLeads: number;
    mql: number;
    paidOrders: number;
    revenue: number;
    emailRevenue: number;
    dailyRevenue?: Array<{ label: string; value: number }>;
  };
};

export type SegmentRules = {
  combinator: "and" | "or";
  conditions: SegmentCondition[];
};

export type SegmentCondition = {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains" | "in" | "exists";
  value?: unknown;
};

export type WorkflowNodeDefinition = {
  type: string;
  config?: Record<string, unknown>;
};

export type WorkflowStepEvaluation =
  | { status: "pending"; action: string }
  | { status: "waiting"; waitMs: number }
  | { status: "success"; action?: string }
  | { status: "skipped"; reason: string };

export type CrmLeadBulkAction =
  | "assign_owner"
  | "update_stage"
  | "add_tag"
  | "mark_zalo_messaged"
  | "send_email"
  | "add_workflow"
  | "export_csv";

export type CrmLeadBulkActionResultItem = {
  leadId: string;
  status: "updated" | "skipped" | "failed";
  reason?: string;
};

export type CrmLeadBulkActionResult = {
  ok: boolean;
  action: CrmLeadBulkAction;
  requested: number;
  affected: number;
  skipped: number;
  failed: number;
  results: CrmLeadBulkActionResultItem[];
  message?: string;
};

export type CrmLeadExportResult = {
  filename: string;
  csv: string;
  rows: number;
  requested: number;
};

export type CrmLeadBulkActionPayload =
  | {
      action: "assign_owner";
      leadIds: string[];
      owner: string;
      idempotencyKey?: string;
    }
  | {
      action: "update_stage";
      leadIds: string[];
      stage: CrmStage;
      idempotencyKey?: string;
    }
  | {
      action: "add_tag";
      leadIds: string[];
      tags: string[];
      idempotencyKey?: string;
    }
  | {
      action: "mark_zalo_messaged";
      leadIds: string[];
      phone?: string;
      email?: string;
      orderCode?: string;
      idempotencyKey?: string;
    }
  | {
      action: "send_email";
      leadIds: string[];
      subject?: string;
      templateId?: string;
      idempotencyKey?: string;
    }
  | {
      action: "add_workflow";
      leadIds: string[];
      workflowId: string;
      idempotencyKey?: string;
    }
  | {
      action: "export_csv";
      leadIds: string[];
      filename?: string;
    };

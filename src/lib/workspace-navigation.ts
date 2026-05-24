export type WorkspaceTab =
  | "overview"
  | "crm"
  | "lms"
  | "automation"
  | "events"
  | "payments"
  | "reports"
  | "logs"
  | "settings";

export type WorkspaceTabItem = {
  value: WorkspaceTab;
  label: string;
};

export type WorkspaceNavItem = {
  id: string;
  label: string;
  tab: WorkspaceTab;
};

export const workspaceTabs: WorkspaceTabItem[] = [
  { value: "overview", label: "Dashboard" },
  { value: "crm", label: "CRM" },
  { value: "lms", label: "LMS" },
  { value: "automation", label: "Automation" },
  { value: "events", label: "Click events" },
  { value: "payments", label: "Payments" },
  { value: "reports", label: "Reports" },
  { value: "logs", label: "Audit" },
  { value: "settings", label: "Settings" },
];

export const workspaceNavigation: WorkspaceNavItem[] = [
  { id: "overview", label: "Tổng quan", tab: "overview" },
  { id: "crm", label: "Lead CRM", tab: "crm" },
  { id: "students", label: "Học viên", tab: "lms" },
  { id: "courses", label: "Khóa học", tab: "lms" },
  { id: "automation", label: "Automation", tab: "automation" },
  { id: "events", label: "Click events", tab: "events" },
  { id: "payments", label: "Thanh toán", tab: "payments" },
  { id: "reports", label: "Báo cáo", tab: "reports" },
  { id: "logs", label: "Audit logs", tab: "logs" },
  { id: "settings", label: "Cài đặt", tab: "settings" },
];

export function isWorkspaceTab(value: string): value is WorkspaceTab {
  return workspaceTabs.some((tab) => tab.value === value);
}

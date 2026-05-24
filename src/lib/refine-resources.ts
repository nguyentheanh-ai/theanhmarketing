import type { IResourceItem } from "@refinedev/core";

export const refineResources: IResourceItem[] = [
  {
    name: "leads",
    list: "/crm",
    meta: { label: "Lead CRM" },
  },
  {
    name: "student_access_records",
    list: "/students",
    meta: { label: "Học viên", source: "derived-from-orders-and-leads" },
  },
  {
    name: "courses",
    list: "/courses",
    meta: { label: "Khóa học" },
  },
  {
    name: "orders",
    list: "/payments",
    meta: { label: "Thanh toán" },
  },
  {
    name: "click_events",
    list: "/analytics/click-events",
    meta: { label: "Click events" },
  },
  {
    name: "automation_flows",
    list: "/automation",
    meta: { label: "Automation" },
  },
  {
    name: "activity_logs",
    list: "/activity-logs",
    meta: { label: "Audit logs" },
  },
];

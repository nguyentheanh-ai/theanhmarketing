export type PaymentStatus = "unpaid" | "partial" | "paid" | "failed" | "refunded";

export type CareStatus =
  | "new"
  | "contacted"
  | "consulting"
  | "waiting_payment"
  | "paid"
  | "access_granted"
  | "lost";

export type Lead = {
  id: string;
  code: string;
  orderCode: string;
  name: string;
  email: string;
  phone: string;
  courseId: string;
  courseName: string;
  landingPage: string;
  campaign: string;
  utmSource: string;
  paymentStatus: PaymentStatus;
  careStatus: CareStatus;
  owner: string;
  price: number;
  paidAmount: number;
  registeredAt: string;
  paidAt?: string;
  tags: string[];
  notes: string;
};

export type Course = {
  id: string;
  title: string;
  price: number;
  students: number;
  lessons: number;
  completionRate: number;
  revenue: number;
  status: "draft" | "active" | "archived";
};

export type ClickEvent = {
  id: string;
  leadId?: string;
  userId?: string;
  sessionId?: string;
  courseId?: string;
  landingPageId?: string;
  eventName: string;
  eventType:
    | "phone_click"
    | "zalo_click"
    | "messenger_click"
    | "cta_click"
    | "form_submit"
    | "scroll_depth"
    | "pricing_view"
    | "add_to_cart"
    | "checkout_start"
    | "payment_success"
    | "payment_failed";
  buttonName?: string;
  pageUrl: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  browser?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  createdAt: string;
};

export type Order = {
  id: string;
  leadId: string;
  transactionId?: string;
  gateway: "SePay" | "Stripe" | "Bank transfer" | "Momo" | "Manual";
  amount: number;
  paidAmount: number;
  status: PaymentStatus;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  actor: string;
  action: string;
  module: "CRM" | "LMS" | "Payment" | "Automation" | "Settings";
  target: string;
  before?: string;
  after?: string;
  ipAddress: string;
  createdAt: string;
};

export type AutomationFlow = {
  id: string;
  name: string;
  trigger: string;
  status: "active" | "draft" | "paused";
  audience: number;
  openRate: number;
  clickRate: number;
  revenue: number;
};

export type RevenuePoint = {
  date: string;
  revenue: number;
  target: number;
};

export type CampaignPoint = {
  source: string;
  leads: number;
  payments: number;
  ctr: number;
};

export type AdminDataset = {
  leads: Lead[];
  courses: Course[];
  clickEvents: ClickEvent[];
  orders: Order[];
  activityLogs?: ActivityLog[];
  automationFlows?: AutomationFlow[];
  revenueSeries?: RevenuePoint[];
  campaignSeries?: CampaignPoint[];
};

export type DashboardSummary = {
  totalRevenue: number;
  todayRevenue: number;
  totalStudents: number;
  newStudentsToday: number;
  totalCourses: number;
  totalLeads: number;
  totalOrders: number;
  totalLandingPageVisits: number;
  totalConversions: number;
  paidOrders: number;
  unpaidOrders: number;
  partialOrders: number;
};

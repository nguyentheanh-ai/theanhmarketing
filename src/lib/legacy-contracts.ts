export const legacyBrandAssets = {
  logo: "/brand/ta-logo.svg",
  mark: "/brand/ta-mark.svg",
} as const;

export const preservedLegacyTables = [
  "courses",
  "course_modules",
  "lessons",
  "lesson_resources",
  "lesson_comments",
  "resources",
  "leads",
  "orders",
  "testimonials",
  "blog_posts",
  "site_settings",
] as const;

export const legacyStudentAccessContract = {
  ordersTable: "orders",
  manualStudentLeadPrefix: "admin-student:",
  paidStatus: "paid",
  preservedFields: [
    "order_code",
    "student_name",
    "email",
    "phone",
    "course_slug",
    "course_title",
    "order_items",
    "status",
    "paid_at",
  ],
} as const;

export const legacyFacebookPixelContract = {
  table: "site_settings",
  key: "marketing",
  jsonFields: ["trackingEnabled", "facebookPixelEnabled", "facebookPixelId"],
} as const;

export const additiveAdminTables = [
  "landing_pages",
  "click_events",
  "email_templates",
  "automation_flows",
  "automation_runs",
  "coupons",
  "activity_logs",
  "app_settings",
] as const;

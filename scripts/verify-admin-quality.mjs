import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const checks = [
  {
    file: "components/app/admin-shell.tsx",
    required: [
      "Quản lý tập trung",
      "Học viên",
      "Lead",
      "Ads & doanh thu",
      "Khóa học",
      "Thành viên admin",
    ],
    forbidden: [
      "Đơn hàng",
      "Remarketing",
      "SEO/Tracking",
      "Feedback",
    ],
  },
  {
    file: "app/admin/facebook-ads/page.tsx",
    required: ["ProductAdsReportClient", 'allowedRoles={["owner"]}'],
    forbidden: [],
  },
  {
    file: "components/admin/product-ads-report-client.tsx",
    required: [
      "Sản phẩm",
      "Chi phí QC",
      "DT phễu",
      "ME/RE",
      "Leads",
      "Lead TB/ngày",
      "KPI Lead/ngày",
      "Giá Lead (KH)",
      "Chi phí/Lead TT",
      "Click",
      "CVR LP",
      "overflow-x-auto",
      "sticky top-0",
    ],
    forbidden: [],
  },
  {
    file: "app/admin/thanh-vien-admin/page.tsx",
    required: ["AdminMembersClient", 'allowedRoles={["owner"]}'],
    forbidden: [],
  },
  {
    file: "app/admin/hoc-vien/page.tsx",
    forbidden: [
      "Total Students",
      "Active Access",
      "Add New Student",
      "Student List",
      "Name/Contact",
      "Access Status",
      "Enrolled Course",
      "Order ID",
      "No name",
      "No contact",
      "No order",
      "No course",
      "No students yet",
      "Student records will appear",
    ],
  },
  {
    file: "components/admin/student-intake-form.tsx",
    forbidden: [
      "Full Name",
      "Phone Number",
      "Course Selection",
      "Access Status",
      "Granted",
      "Add Student",
      "Saving...",
      "Source / Note",
    ],
  },
  {
    file: "components/admin/admin-growth-os-dashboard.tsx",
    forbidden: [
      'label: "Dashboard"',
      'label: "Automation"',
      'label: "Click events"',
      'label: "Payments"',
      'label: "Reports"',
      "Lead CRM management",
      "Payment management",
    ],
  },
];

const failures = [];

for (const check of checks) {
  const source = read(check.file);

  for (const phrase of check.required ?? []) {
    if (!source.includes(phrase)) {
      failures.push(`${check.file}: thiếu nội dung bắt buộc "${phrase}"`);
    }
  }

  for (const phrase of check.forbidden) {
    if (source.includes(phrase)) {
      failures.push(`${check.file}: còn label/copy chưa chuẩn "${phrase}"`);
    }
  }
}

const plan = read("docs/CRM_ADMIN_WEBSITE_AUDIT_PLAN_2026-05-31.md");

for (const requiredSection of ["Checklist lỗi phải kiểm tra", "Rủi ro và khó khăn dự trù", "Definition of Done"]) {
  if (!plan.includes(requiredSection)) {
    failures.push(`docs/CRM_ADMIN_WEBSITE_AUDIT_PLAN_2026-05-31.md: thiếu mục "${requiredSection}"`);
  }
}

if (failures.length > 0) {
  console.error("Admin quality verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin quality verification passed.");

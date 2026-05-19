import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function loadTsModule(relativePath) {
  const fullPath = path.resolve(relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", compiled);
  runner(cjsModule.exports, cjsModule);
  return cjsModule.exports;
}

const {
  buildAdminDashboardModel,
  formatAdminDate,
  getAccessStatusMeta,
  getOrderStatusMeta,
} = loadTsModule("lib/admin/crm-dashboard.ts");

test("builds KPI and priority tasks for the CRM command center", () => {
  const model = buildAdminDashboardModel({
    orders: [
      {
        id: "order-1",
        orderCode: "TA1001",
        studentName: "An",
        email: "an@example.com",
        phone: "0900000001",
        courseSlug: "ads",
        courseTitle: "Facebook Ads",
        amount: 1490000,
        amountLabel: "1.490.000d",
        currency: "VND",
        status: "paid",
        paymentMethod: "sepay",
        paymentQrUrl: "",
        paidAt: "2026-05-19T02:30:00.000Z",
        expiresAt: null,
        createdAt: "2026-05-19T02:00:00.000Z",
        sepayReferenceCode: null,
        orderItems: [],
      },
      {
        id: "order-2",
        orderCode: "TA1002",
        studentName: "Binh",
        email: "binh@example.com",
        phone: "0900000002",
        courseSlug: "crm",
        courseTitle: "CRM Growth",
        amount: 990000,
        amountLabel: "990.000d",
        currency: "VND",
        status: "pending",
        paymentMethod: "sepay",
        paymentQrUrl: "",
        paidAt: null,
        expiresAt: null,
        createdAt: "2026-05-19T01:00:00.000Z",
        sepayReferenceCode: null,
        orderItems: [],
      },
    ],
    leads: [
      {
        id: "lead-1",
        name: "Chi",
        phone: "0900000003",
        email: "chi@example.com",
        need: "Can tu van khoa Ads",
        source: "Facebook",
        status: "Moi",
        createdAt: "2026-05-19T03:00:00.000Z",
      },
    ],
    students: [
      {
        id: "student-1",
        name: "Dung",
        email: "dung@example.com",
        phone: "0900000004",
        role: "Lead",
        accessStatus: "Chua cap quyen",
        paymentStatus: "Cho thanh toan",
        courseTitles: ["Facebook Ads"],
        courseSlugs: ["ads"],
        paidOrderCodes: [],
        pendingOrderCodes: ["TA1002"],
        source: "Zalo",
        note: "",
        updatedAt: "2026-05-19T01:30:00.000Z",
      },
    ],
    now: new Date("2026-05-19T04:00:00.000Z"),
  });

  assert.equal(model.revenue, 1490000);
  assert.equal(model.kpis.find((item) => item.id === "pendingOrders").value, "1");
  assert.equal(model.pipeline.find((item) => item.id === "won").count, 1);
  assert.equal(model.priorityTasks.length, 3);
  assert.deepEqual(
    model.priorityTasks.map((task) => task.type),
    ["order", "lead", "student"],
  );
});

test("formats dates and status metadata for compact admin tables", () => {
  assert.equal(formatAdminDate("2026-05-19T02:30:00.000Z"), "19/05/2026 09:30");
  assert.equal(formatAdminDate("not-a-date"), "not-a-date");
  assert.equal(getOrderStatusMeta("paid").label, "Đã thanh toán");
  assert.equal(getOrderStatusMeta("pending").tone, "warning");
  assert.equal(getAccessStatusMeta("Co quyen hoc").tone, "success");
});

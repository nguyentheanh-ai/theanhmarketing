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

const { buildSoloCommandCenterModel } = loadTsModule("lib/admin/solo-command-center.ts");

function build(overrides = {}) {
  return buildSoloCommandCenterModel({
    range: { from: "2026-07-09", to: "2026-07-11" },
    generatedAt: "2026-07-11T05:00:00.000Z",
    orders: [],
    leads: [],
    courses: [],
    accessRecords: [],
    activities: [],
    ...overrides,
  });
}

test("counts paid-only revenue in the selected and equal previous periods", () => {
  const model = build({
    orders: [
      { id: "current-paid", status: "paid", amount: 1_000, paidAt: "2026-07-09T03:00:00Z", createdAt: "2026-07-09T02:00:00Z" },
      { id: "current-pending", status: "pending", amount: 9_000, createdAt: "2026-07-10T03:00:00Z" },
      { id: "previous-paid", status: "paid", amount: 400, paidAt: "2026-07-06T03:00:00Z", createdAt: "2026-07-06T02:00:00Z" },
      { id: "too-old", status: "paid", amount: 700, paidAt: "2026-07-05T03:00:00Z", createdAt: "2026-07-05T02:00:00Z" },
    ],
  });

  assert.deepEqual(model.kpis.revenue, { value: 1_000, previousValue: 400, changePercent: 150 });
  assert.deepEqual(model.kpis.paidOrders, { value: 1, previousValue: 1, changePercent: 0 });
  assert.deepEqual(model.revenueTrend, [
    { date: "2026-07-09", current: 1_000, previous: 400 },
    { date: "2026-07-10", current: 0, previous: 0 },
    { date: "2026-07-11", current: 0, previous: 0 },
  ]);
});

test("uses truthful zero-baseline change percentages and never turns free or trial access into revenue", () => {
  const zero = build();
  assert.equal(zero.kpis.revenue.changePercent, null);
  assert.equal(zero.kpis.paidOrders.changePercent, null);

  const positive = build({
    orders: [{ id: "paid", status: "paid", amount: 500, paidAt: "2026-07-10T00:00:00Z", createdAt: "2026-07-10T00:00:00Z" }],
    accessRecords: [
      { id: "free", email: "free@example.com", kind: "free", status: "active", grantedAt: "2026-07-09T00:00:00Z", price: 5_000 },
      { id: "trial", email: "trial@example.com", kind: "trial", status: "active", grantedAt: "2026-07-10T00:00:00Z", price: 7_000 },
    ],
  });
  assert.equal(positive.kpis.revenue.value, 500);
  assert.equal(positive.kpis.revenue.changePercent, null);
});

test("uses inclusive Vietnam calendar dates and includes each zero day", () => {
  const model = build({
    range: { from: "2026-07-10", to: "2026-07-12" },
    orders: [
      { id: "before-vn-midnight", status: "paid", amount: 100, paidAt: "2026-07-09T16:59:59.999Z", createdAt: "2026-07-09T16:59:59.999Z" },
      { id: "at-vn-midnight", status: "paid", amount: 200, paidAt: "2026-07-09T17:00:00.000Z", createdAt: "2026-07-09T17:00:00.000Z" },
      { id: "at-next-vn-midnight", status: "paid", amount: 300, paidAt: "2026-07-10T17:00:00.000Z", createdAt: "2026-07-10T17:00:00.000Z" },
    ],
  });

  assert.deepEqual(model.revenueTrend.map((row) => [row.date, row.current]), [
    ["2026-07-10", 200],
    ["2026-07-11", 300],
    ["2026-07-12", 0],
  ]);
  assert.throws(
    () => build({ range: { from: "not-a-date", to: "2026-07-11" } }),
    { name: "RangeError", message: "Invalid command-center range" },
  );
  assert.throws(
    () => build({ range: { from: "2026-07-12", to: "2026-07-11" } }),
    { name: "RangeError", message: "Invalid command-center range" },
  );
});

test("groups unknown order statuses under Khác without dropping them", () => {
  const model = build({
    orders: [
      { id: "paid", status: "paid", amount: 10, paidAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z" },
      { id: "pending", status: "pending", amount: 10, createdAt: "2026-07-09T00:00:00Z" },
      { id: "manual", status: "manual-review", amount: 10, createdAt: "2026-07-09T00:00:00Z" },
      { id: "cancelled", status: "cancelled", amount: 10, createdAt: "2026-07-09T00:00:00Z" },
    ],
  });

  assert.deepEqual(Object.fromEntries(model.orderStatuses.map((row) => [row.label, row.count])), {
    "Đã thanh toán": 1,
    "Chờ thanh toán": 1,
    "Thất bại": 0,
    "Đã hoàn tiền": 0,
    "Khác": 2,
  });
});

test("allocates top-course paid revenue proportionally, evenly, and with title fallback", () => {
  const model = build({
    courses: [
      { id: "a", slug: "course-a", title: "Khóa A" },
      { id: "b", slug: "course-b", title: "Khóa B" },
      { id: "c", slug: "course-c", title: "Khóa C" },
    ],
    orders: [
      {
        id: "weighted", status: "paid", amount: 300, paidAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z",
        orderItems: [{ slug: "course-a", price: 1 }, { slug: "course-b", price: 2 }],
      },
      {
        id: "even", status: "paid", amount: 101, paidAt: "2026-07-10T00:00:00Z", createdAt: "2026-07-10T00:00:00Z",
        orderItems: [{ slug: "course-a" }, { slug: "course-c" }],
      },
      {
        id: "fallback", status: "paid", amount: 25, paidAt: "2026-07-11T00:00:00Z", createdAt: "2026-07-11T00:00:00Z",
        courseSlug: "unknown-course", courseTitle: "Khóa dự phòng",
      },
    ],
  });

  assert.deepEqual(model.topCourses.map((row) => [row.title, row.revenue]), [
    ["Khóa B", 200],
    ["Khóa A", 151],
    ["Khóa C", 50],
    ["Khóa dự phòng", 25],
  ]);
  assert.equal(model.topCourses.reduce((sum, row) => sum + row.revenue, 0), 426);
});

test("counts one paid order per course when duplicate line items share a course", () => {
  const model = build({
    courses: [{ slug: "course-a", title: "Khóa A" }],
    orders: [{
      id: "duplicate-items",
      status: "paid",
      amount: 300,
      paidAt: "2026-07-09T00:00:00Z",
      createdAt: "2026-07-09T00:00:00Z",
      orderItems: [
        { slug: "course-a", title: "Khóa A", price: 100 },
        { slug: "course-a", title: "Khóa A", price: 200 },
      ],
    }],
  });

  assert.deepEqual(model.topCourses, [{ slug: "course-a", title: "Khóa A", revenue: 300, paidOrders: 1 }]);
});

test("links funnel records by normalized email before phone and counts unlinked records separately", () => {
  const model = build({
    leads: [
      { id: "lead-a", email: " Anh@Example.com ", phone: "090-111-2222", createdAt: "2026-07-09T00:00:00Z" },
      { id: "lead-b", email: "binh@example.com", phone: "090 333 4444", createdAt: "2026-07-09T00:00:00Z" },
    ],
    orders: [
      { id: "pending-a", email: "anh@example.com", phone: "000", status: "pending", amount: 0, createdAt: "2026-07-09T00:00:00Z" },
      { id: "paid-b", phone: "+84 90 333 4444", status: "paid", amount: 100, paidAt: "2026-07-10T00:00:00Z", createdAt: "2026-07-10T00:00:00Z", emailSentAt: "2026-07-10T00:01:00Z" },
      { id: "unlinked-order", email: "nobody@example.com", status: "paid", amount: 50, paidAt: "2026-07-10T00:00:00Z", createdAt: "2026-07-10T00:00:00Z", emailSentAt: "2026-07-10T00:01:00Z" },
    ],
    accessRecords: [
      { id: "access-b", email: "BINH@example.com", status: "active", kind: "paid", grantedAt: "2026-07-10T01:00:00Z" },
      { id: "unlinked-access", email: "student-only@example.com", status: "active", kind: "free", grantedAt: "2026-07-10T01:00:00Z" },
    ],
  });

  assert.deepEqual(model.funnel.rows.map((row) => [row.stage, row.count]), [
    ["lead", 2],
    ["pending", 1],
    ["paid", 1],
    ["enrolled", 1],
  ]);
  assert.equal(model.funnel.unlinkedCount, 2);
});

test("deduplicates first active student access and grows paid, free, and trial series", () => {
  const model = build({
    accessRecords: [
      { id: "paid-first", email: "ONE@example.com", status: "active", kind: "paid", grantedAt: "2026-07-09T01:00:00Z" },
      { id: "paid-duplicate", email: " one@example.com ", status: "active", kind: "paid", grantedAt: "2026-07-10T01:00:00Z" },
      { id: "free", phone: "090-555-0000", status: "active", kind: "free", enrolledAt: "2026-07-10T01:00:00Z" },
      { id: "trial", email: "trial@example.com", status: "active", kind: "trial", grantedAt: "2026-07-11T01:00:00Z" },
      { id: "pending", email: "pending@example.com", status: "pending", kind: "paid", grantedAt: "2026-07-11T01:00:00Z" },
    ],
  });

  assert.equal(model.kpis.newStudents.value, 3);
  assert.deepEqual(model.studentGrowth, [
    { date: "2026-07-09", kind: "paid", count: 1 },
    { date: "2026-07-09", kind: "free", count: 0 },
    { date: "2026-07-09", kind: "trial", count: 0 },
    { date: "2026-07-10", kind: "paid", count: 0 },
    { date: "2026-07-10", kind: "free", count: 1 },
    { date: "2026-07-10", kind: "trial", count: 0 },
    { date: "2026-07-11", kind: "paid", count: 0 },
    { date: "2026-07-11", kind: "free", count: 0 },
    { date: "2026-07-11", kind: "trial", count: 1 },
  ]);
});

test("uses enrollment or grant creation before first access when deciding whether a student is new", () => {
  const model = build({
    accessRecords: [{
      id: "existing-student",
      email: "existing@example.com",
      status: "active",
      kind: "paid",
      enrolledAt: "2026-07-08T01:00:00Z",
      grantedAt: "2026-07-08T02:00:00Z",
      createdAt: "2026-07-08T00:00:00Z",
      firstAccessAt: "2026-07-10T01:00:00Z",
    }],
  });

  assert.equal(model.kpis.newStudents.value, 0);
  assert.equal(model.kpis.newStudents.previousValue, 1);
});

test("classifies access health including expiring, expired, pending, and failure evidence", () => {
  const model = build({
    generatedAt: "2026-07-11T05:00:00.000Z",
    accessRecords: [
      { id: "active", email: "active@example.com", status: "active", kind: "paid", grantedAt: "2026-07-01T00:00:00Z" },
      { id: "expiring", email: "expiring@example.com", status: "active", kind: "trial", grantedAt: "2026-07-01T00:00:00Z", expiresAt: "2026-07-14T05:00:00.000Z" },
      { id: "expired", email: "expired@example.com", status: "active", kind: "trial", grantedAt: "2026-07-01T00:00:00Z", expiresAt: "2026-07-11T04:59:59.000Z" },
      { id: "pending", email: "pending@example.com", status: "pending", kind: "paid", grantedAt: "2026-07-01T00:00:00Z" },
      { id: "activity-failed", email: "failed@example.com", status: "active", kind: "paid", grantedAt: "2026-07-01T00:00:00Z" },
    ],
    activities: [{ id: "failure", kind: "access", status: "failed", email: "failed@example.com", createdAt: "2026-07-10T00:00:00Z" }],
  });

  assert.deepEqual(model.accessHealth, [
    { status: "active", count: 1 },
    { status: "pending", count: 1 },
    { status: "expiring", count: 1 },
    { status: "error", count: 2 },
  ]);
});

test("only classifies trials as expiring while paid and free access remain active", () => {
  const model = build({
    generatedAt: "2026-07-11T05:00:00.000Z",
    accessRecords: [
      { id: "paid-future-expiry", email: "paid@example.com", status: "active", kind: "paid", grantedAt: "2026-07-01T00:00:00Z", expiresAt: "2026-07-13T05:00:00Z" },
      { id: "free-future-expiry", email: "free@example.com", status: "active", kind: "free", grantedAt: "2026-07-01T00:00:00Z", expiresAt: "2026-07-13T05:00:00Z" },
      { id: "trial-future-expiry", email: "trial@example.com", status: "active", kind: "trial", grantedAt: "2026-07-01T00:00:00Z", expiresAt: "2026-07-13T05:00:00Z" },
    ],
  });

  assert.deepEqual(model.accessHealth, [
    { status: "active", count: 2 },
    { status: "pending", count: 0 },
    { status: "expiring", count: 1 },
    { status: "error", count: 0 },
  ]);
});

test("targets access failures by access id and excludes revoked or unknown access states", () => {
  const model = build({
    accessRecords: [
      { id: "access-target", email: "same@example.com", status: "active", kind: "paid", grantedAt: "2026-07-01T00:00:00Z" },
      { id: "access-healthy", email: "same@example.com", status: "active", kind: "paid", grantedAt: "2026-07-01T00:00:00Z" },
      { id: "access-revoked", email: "revoked@example.com", status: "revoked", kind: "paid", grantedAt: "2026-07-01T00:00:00Z", expiresAt: "2026-07-02T00:00:00Z" },
      { id: "access-paused", email: "paused@example.com", status: "paused", kind: "paid", grantedAt: "2026-07-01T00:00:00Z" },
      { id: "access-inactive", email: "inactive@example.com", status: "inactive", kind: "paid", grantedAt: "2026-07-01T00:00:00Z" },
      { id: "access-unknown", email: "unknown@example.com", status: "unexpected", kind: "paid", grantedAt: "2026-07-01T00:00:00Z" },
    ],
    activities: [{
      id: "targeted-failure",
      kind: "access",
      status: "failed",
      accessId: "access-target",
      email: "same@example.com",
      createdAt: "2026-07-10T00:00:00Z",
    }],
  });

  assert.deepEqual(model.accessHealth, [
    { status: "active", count: 1 },
    { status: "pending", count: 0 },
    { status: "expiring", count: 0 },
    { status: "error", count: 1 },
  ]);
});

test("builds a stable priority queue at strict 24-hour and inclusive 3-day thresholds", () => {
  const model = build({
    generatedAt: "2026-07-11T05:00:00.000Z",
    orders: [
      { id: "old-pending", orderCode: "TA-OLD", status: "pending", amount: 10, createdAt: "2026-07-10T04:59:59.000Z" },
      { id: "exact-pending", orderCode: "TA-EXACT", status: "pending", amount: 10, createdAt: "2026-07-10T05:00:00.000Z" },
      { id: "paid-missing-email", orderCode: "TA-PAID", email: "paid@example.com", status: "paid", amount: 10, paidAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z" },
    ],
    accessRecords: [
      { id: "trial-three-days", email: "trial@example.com", status: "active", kind: "trial", grantedAt: "2026-07-01T00:00:00Z", expiresAt: "2026-07-14T05:00:00.000Z" },
    ],
    activities: [
      { id: "access-failure", kind: "access", status: "failed", accessId: "access-9", createdAt: "2026-07-08T00:00:00Z", detail: "Không thể cấp quyền; token=do-not-expose" },
      { id: "email-failure", kind: "email", status: "failed", orderId: "paid-missing-email", createdAt: "2026-07-09T01:00:00Z", detail: "Email thanh toán thất bại" },
      { id: "account-failure", kind: "account", status: "failed", studentId: "student-8", createdAt: "2026-07-10T00:00:00Z", detail: "Không thể tạo tài khoản" },
    ],
  });

  assert.deepEqual(model.priorityTasks.map((task) => [task.id, task.severity, task.kind]), [
    ["activity-access-access-failure", "critical", "access"],
    ["order-email-paid-missing-email", "critical", "email"],
    ["activity-account-account-failure", "critical", "account"],
    ["pending-order-old-pending", "warning", "pending-order"],
    ["trial-expiring-trial-three-days", "info", "trial"],
  ]);
  assert.ok(model.priorityTasks.every((task) => task.href.startsWith("/admin/")));
  assert.ok(!model.priorityTasks.some((task) => JSON.stringify(task).match(/password|token|secret/i)));
});

test("uses only payment-success markers and orders email failures chronologically", () => {
  const model = build({
    orders: [
      {
        id: "pending-marker-only", email: "pending@example.com", status: "paid", amount: 10,
        paidAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z", emailSentAt: "2026-07-09T00:01:00Z",
      },
      {
        id: "success-after-failure", email: "resolved@example.com", status: "paid", amount: 10,
        paidAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z", paymentEmailSentAt: "2026-07-09T03:00:00Z",
      },
      {
        id: "failure-after-success", email: "retry@example.com", status: "paid", amount: 10,
        paidAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z", paymentSuccessEmailSentAt: "2026-07-09T02:00:00Z",
      },
      {
        id: "latest-success-wins", email: "latest@example.com", status: "paid", amount: 10,
        paidAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z",
        paymentEmailSentAt: "2026-07-09T01:00:00Z", paymentSuccessEmailSentAt: "2026-07-09T03:00:00Z",
      },
      {
        id: "invalid-marker", email: "invalid@example.com", status: "paid", amount: 10,
        paidAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z",
        paymentEmailSentAt: "not-a-timestamp", paymentSuccessEmailSentAt: "2026-07-09T03:00:00Z",
      },
      {
        id: "email-less-a", status: "paid", amount: 10, paidAt: "2026-07-09T00:00:00Z",
        createdAt: "2026-07-09T00:00:00Z", paymentEmailSentAt: "2026-07-09T01:00:00Z",
      },
      {
        id: "email-less-b", status: "paid", amount: 10, paidAt: "2026-07-09T00:00:00Z",
        createdAt: "2026-07-09T00:00:00Z", paymentEmailSentAt: "2026-07-09T01:00:00Z",
      },
    ],
    activities: [
      { id: "old-failure", kind: "email", status: "failed", orderId: "success-after-failure", createdAt: "2026-07-09T02:00:00Z" },
      { id: "new-failure", kind: "email", status: "failed", orderId: "failure-after-success", createdAt: "2026-07-09T03:00:00Z" },
      { id: "middle-failure", kind: "email", status: "failed", orderId: "latest-success-wins", createdAt: "2026-07-09T02:00:00Z" },
      { id: "invalid-marker-old-failure", kind: "email", status: "failed", orderId: "invalid-marker", createdAt: "2026-07-09T02:00:00Z" },
      { id: "email-less-failure", kind: "email", status: "failed", createdAt: "2026-07-09T04:00:00Z" },
    ],
  });

  assert.deepEqual(
    model.priorityTasks.filter((task) => task.kind === "email").map((task) => task.id),
    ["order-email-pending-marker-only", "order-email-failure-after-success"],
  );
});

test("never copies arbitrary failure details into priority tasks", () => {
  const model = build({
    activities: [
      { id: "detail-1", kind: "account", status: "failed", studentId: "s1", createdAt: "2026-07-08T00:00:00Z", detail: "Authorization: Bearer abc123" },
      { id: "detail-2", kind: "access", status: "failed", accessId: "a2", createdAt: "2026-07-08T01:00:00Z", detail: "api_key=xyz789" },
      { id: "detail-3", kind: "account", status: "failed", studentId: "s3", createdAt: "2026-07-08T02:00:00Z", detail: "Mật khẩu tạm: 123456" },
      { id: "detail-4", kind: "access", status: "failed", accessId: "a4", createdAt: "2026-07-08T03:00:00Z", detail: "token=abc; secret=def" },
    ],
  });

  const serialized = JSON.stringify(model.priorityTasks);
  for (const fragment of ["Authorization", "Bearer", "abc123", "api_key", "xyz789", "Mật khẩu", "123456", "token", "secret"]) {
    assert.ok(!serialized.includes(fragment), `priority tasks exposed ${fragment}`);
  }
});

test("preserves explicit source errors while defaulting omitted data status to ready", () => {
  const defaults = build();
  assert.deepEqual(defaults.dataStatus, { orders: "ready", leads: "ready", courses: "ready", students: "ready", activities: "ready" });

  const withError = build({ dataStatus: { orders: "error", courses: "error", activities: "error" } });
  assert.deepEqual(withError.dataStatus, { orders: "error", leads: "ready", courses: "error", students: "ready", activities: "error" });
});

test("counts new leads against the equal previous period", () => {
  const model = build({
    leads: [
      { id: "previous", email: "previous@example.com", createdAt: "2026-07-07T00:00:00Z" },
      { id: "current-1", email: "one@example.com", createdAt: "2026-07-09T00:00:00Z" },
      { id: "current-2", email: "two@example.com", createdAt: "2026-07-11T00:00:00Z" },
    ],
  });
  assert.deepEqual(model.kpis.newLeads, { value: 2, previousValue: 1, changePercent: 100 });
});

test("requires a valid generatedAt and has no implicit clock fallback", () => {
  assert.throws(
    () => build({ generatedAt: undefined }),
    { name: "RangeError", message: "Invalid generatedAt" },
  );
  assert.throws(
    () => build({ generatedAt: "not-a-timestamp" }),
    { name: "RangeError", message: "Invalid generatedAt" },
  );

  const source = fs.readFileSync(path.resolve("lib/admin/solo-command-center.ts"), "utf8");
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /new Date\s*\(\s*\)/);
  assert.match(source, /generatedAt:\s*Date\s*\|\s*string/);
});

test("latest account and access activity resolves older failures by stable target", () => {
  const model = build({
    accessRecords: [
      { id: "access-resolved", studentId: "student-1", email: "old@example.com", kind: "paid", status: "active", grantedAt: "2026-07-09T00:00:00Z" },
      { id: "access-failed", studentId: "student-2", email: "two@example.com", kind: "paid", status: "active", grantedAt: "2026-07-09T00:00:00Z" },
    ],
    activities: [
      { id: "a-old-fail", kind: "access", status: "failed", accessId: "access-resolved", createdAt: "2026-07-09T01:00:00Z" },
      { id: "a-new-success", kind: "access", status: "success", accessId: "access-resolved", createdAt: "2026-07-09T02:00:00Z" },
      { id: "a-old-success", kind: "access", status: "success", accessId: "access-failed", createdAt: "2026-07-09T01:00:00Z" },
      { id: "a-new-fail", kind: "access", status: "failed", accessId: "access-failed", createdAt: "2026-07-09T02:00:00Z" },
      { id: "account-old-fail", kind: "account", status: "failed", studentId: "student-1", createdAt: "2026-07-09T01:00:00Z" },
      { id: "account-new-success", kind: "account", status: "success", studentId: "student-1", createdAt: "2026-07-09T02:00:00Z" },
    ],
  });

  assert.deepEqual(model.priorityTasks.filter((task) => task.kind === "access").map((task) => task.id), ["activity-access-a-new-fail"]);
  assert.equal(model.priorityTasks.filter((task) => task.kind === "account").length, 0);
  assert.deepEqual(model.accessHealth, [
    { status: "active", count: 1 }, { status: "pending", count: 0 },
    { status: "expiring", count: 0 }, { status: "error", count: 1 },
  ]);
});

test("deduplicates students by studentId before changed contact details", () => {
  const model = build({
    accessRecords: [
      { id: "row-1", studentId: "stable-student", email: "old@example.com", kind: "paid", status: "active", grantedAt: "2026-07-09T00:00:00Z" },
      { id: "row-2", studentId: "stable-student", email: "new@example.com", kind: "paid", status: "active", grantedAt: "2026-07-10T00:00:00Z" },
    ],
  });
  assert.equal(model.kpis.newStudents.value, 1);
  assert.equal(model.studentGrowth.reduce((sum, row) => sum + row.count, 0), 1);
});

test("rejects missing or unknown access kinds", () => {
  assert.throws(
    () => build({ accessRecords: [{ id: "missing-kind", email: "x@example.com", status: "active", grantedAt: "2026-07-09T00:00:00Z" }] }),
    { name: "RangeError", message: "Invalid access kind" },
  );
  assert.throws(
    () => build({ accessRecords: [{ id: "unknown-kind", email: "x@example.com", kind: "vip", status: "active", grantedAt: "2026-07-09T00:00:00Z" }] }),
    { name: "RangeError", message: "Invalid access kind" },
  );
});

test("emits one contact-level email exception without fanning out across orders", () => {
  const model = build({
    orders: ["one", "two"].map((id) => ({
      id, email: "same@example.com", status: "paid", amount: 10,
      createdAt: "2026-07-09T00:00:00Z", paidAt: "2026-07-09T00:00:00Z",
      paymentEmailSentAt: "2026-07-09T01:00:00Z",
    })),
    activities: [{ id: "contact-email-fail", kind: "email", status: "failed", email: "same@example.com", createdAt: "2026-07-09T02:00:00Z" }],
  });
  assert.deepEqual(model.priorityTasks.filter((task) => task.kind === "email").map((task) => task.id), ["activity-email-contact-email-fail"]);
});

test("rejects offset-less and invalid record timestamps deterministically", () => {
  assert.throws(
    () => build({ leads: [{ id: "local-time", createdAt: "2026-07-09T10:00:00" }] }),
    { name: "RangeError", message: "Invalid record timestamp" },
  );
  assert.throws(
    () => build({ orders: [{ id: "bad", status: "paid", amount: 1, createdAt: "bad", paidAt: "2026-07-09T00:00:00Z" }] }),
    { name: "RangeError", message: "Invalid record timestamp" },
  );
  assert.throws(
    () => build({ generatedAt: "2026-07-11T05:00:00" }),
    { name: "RangeError", message: "Invalid generatedAt" },
  );
});

test("merges students and accessRecords aliases without double counting", () => {
  const row = { id: "shared-access", studentId: "shared-student", email: "shared@example.com", kind: "trial", status: "active", grantedAt: "2026-07-09T00:00:00Z", expiresAt: "2026-07-13T05:00:00Z" };
  const model = build({ students: [row], accessRecords: [row] });
  assert.equal(model.kpis.newStudents.value, 1);
  assert.equal(model.accessHealth.reduce((sum, item) => sum + item.count, 0), 1);
  assert.equal(model.priorityTasks.filter((task) => task.kind === "trial").length, 1);
});

test("rejects impossible zoned calendar timestamps while accepting valid leap days and offsets", () => {
  for (const createdAt of [
    "2026-02-30T10:00:00Z",
    "2025-02-29T10:00:00Z",
    "2026-01-01T25:00:00Z",
    "2026-01-01T10:00:00+24:00",
    "2026-01-01T10:00:00+07:60",
  ]) {
    assert.throws(
      () => build({ leads: [{ id: createdAt, createdAt }] }),
      { name: "RangeError", message: "Invalid record timestamp" },
    );
  }
  assert.equal(build({ leads: [{ id: "leap", createdAt: "2024-02-29T23:59:59Z" }] }).kpis.newLeads.value, 0);
  assert.equal(build({ leads: [{ id: "offset", createdAt: "2026-07-09T07:00:00+07:00" }] }).kpis.newLeads.value, 1);
});

test("consolidates contact email failures and lets a later success resolve them", () => {
  const baseOrder = { id: "paid", email: "contact@example.com", status: "paid", amount: 10, createdAt: "2026-07-09T00:00:00Z", paidAt: "2026-07-09T00:00:00Z", paymentEmailSentAt: "2026-07-09T00:30:00Z" };
  const failures = build({
    orders: [baseOrder],
    activities: [
      { id: "email-fail-old", kind: "email", status: "failed", email: "contact@example.com", createdAt: "2026-07-09T01:00:00Z" },
      { id: "email-fail-new", kind: "email", status: "failed", email: "contact@example.com", createdAt: "2026-07-09T02:00:00Z" },
    ],
  });
  assert.deepEqual(failures.priorityTasks.filter((task) => task.kind === "email").map((task) => task.id), ["activity-email-email-fail-new"]);

  const resolved = build({
    orders: [baseOrder],
    activities: [
      { id: "email-fail", kind: "email", status: "failed", email: "contact@example.com", createdAt: "2026-07-09T01:00:00Z" },
      { id: "email-success", kind: "email", status: "success", email: "contact@example.com", createdAt: "2026-07-09T02:00:00Z" },
    ],
  });
  assert.equal(resolved.priorityTasks.filter((task) => task.kind === "email").length, 0);
});

test("uses the most-specific access activity scope consistently for health and priority", () => {
  const access = { id: "specific-access", studentId: "student-scope", email: "scope@example.com", kind: "paid", status: "active", grantedAt: "2026-07-09T00:00:00Z" };
  const specificWins = build({
    accessRecords: [access],
    activities: [
      { id: "specific-failure", kind: "access", status: "failed", accessId: "specific-access", createdAt: "2026-07-09T01:00:00Z" },
      { id: "broad-success", kind: "access", status: "success", email: "scope@example.com", createdAt: "2026-07-09T02:00:00Z" },
    ],
  });
  assert.equal(specificWins.accessHealth.find((row) => row.status === "error").count, 1);
  assert.deepEqual(specificWins.priorityTasks.filter((task) => task.kind === "access").map((task) => task.id), ["activity-access-specific-failure"]);

  const resolvedSpecific = build({
    accessRecords: [access],
    activities: [
      { id: "specific-failure", kind: "access", status: "failed", accessId: "specific-access", createdAt: "2026-07-09T01:00:00Z" },
      { id: "specific-success", kind: "access", status: "success", accessId: "specific-access", createdAt: "2026-07-09T02:00:00Z" },
    ],
  });
  assert.equal(resolvedSpecific.accessHealth.find((row) => row.status === "error").count, 0);
  assert.equal(resolvedSpecific.priorityTasks.filter((task) => task.kind === "access").length, 0);
});

test("specific access success shadows a broader contact failure in health and queue", () => {
  const model = build({
    accessRecords: [{ id: "shadowed-access", studentId: "shadowed-student", email: "shadowed@example.com", kind: "paid", status: "active", grantedAt: "2026-07-09T00:00:00Z" }],
    activities: [
      { id: "specific-success", kind: "access", status: "success", accessId: "shadowed-access", createdAt: "2026-07-09T01:00:00Z" },
      { id: "broad-failure", kind: "access", status: "failed", email: "shadowed@example.com", createdAt: "2026-07-09T02:00:00Z" },
    ],
  });
  assert.equal(model.accessHealth.find((row) => row.status === "active").count, 1);
  assert.equal(model.priorityTasks.filter((task) => task.kind === "access").length, 0);
});

test("emits one safe task for an unlinked operational failure", () => {
  const model = build({
    activities: [{ id: "orphan-failure", kind: "access", status: "failed", createdAt: "2026-07-09T01:00:00Z", detail: "Authorization: Bearer hidden" }],
  });
  const tasks = model.priorityTasks.filter((task) => task.kind === "access");
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, "activity-access-orphan-failure");
  assert.equal(tasks[0].href, `/admin/dashboard?task=${encodeURIComponent(tasks[0].id)}#viec-can-xu-ly`);
  assert.ok(!JSON.stringify(tasks).includes("Bearer hidden"));
});

test("rejects sub-millisecond timestamps and resolves equal milliseconds by stable activity id", () => {
  assert.throws(
    () => build({ leads: [{ id: "too-precise", createdAt: "2026-07-09T00:00:00.1234Z" }] }),
    { name: "RangeError", message: "Invalid record timestamp" },
  );
  const activities = [
    { id: "activity-a", kind: "access", status: "failed", accessId: "tie-access", createdAt: "2026-07-09T01:00:00.123Z" },
    { id: "activity-b", kind: "access", status: "success", accessId: "tie-access", createdAt: "2026-07-09T01:00:00.123Z" },
  ];
  const input = { accessRecords: [{ id: "tie-access", email: "tie@example.com", kind: "paid", status: "active", grantedAt: "2026-07-09T00:00:00Z" }] };
  const forward = build({ ...input, activities });
  const reversed = build({ ...input, activities: [...activities].reverse() });
  assert.deepEqual(forward, reversed);
  assert.equal(forward.priorityTasks.filter((task) => task.kind === "access").length, 0);
});

test("never serializes contact PII into priority task URLs or text", () => {
  const email = "private.person@example.com";
  const phone = "090 123 4567";
  const model = build({
    activities: [
      { id: "contact-email", kind: "email", status: "failed", email, phone, createdAt: "2026-07-09T01:00:00Z" },
      { id: "contact-access", kind: "access", status: "failed", email, phone, createdAt: "2026-07-09T02:00:00Z" },
      { id: "contact-account", kind: "account", status: "failed", email, phone, createdAt: "2026-07-09T03:00:00Z" },
    ],
  });
  const serialized = JSON.stringify(model.priorityTasks);
  assert.ok(!serialized.includes(email));
  assert.ok(!serialized.includes(phone));
  assert.ok(!serialized.includes("0901234567"));
  assert.ok(model.priorityTasks.every((task) => task.href === `/admin/dashboard?task=${encodeURIComponent(task.id)}#viec-can-xu-ly`));
});

test("declares access kind as a required narrow union while keeping runtime validation", () => {
  const source = fs.readFileSync(path.resolve("lib/admin/solo-command-center.ts"), "utf8");
  assert.match(source, /export type AccessKind\s*=\s*"paid"\s*\|\s*"free"\s*\|\s*"trial"/);
  assert.match(source, /kind:\s*AccessKind;\s*accessKind\?:\s*AccessKind/);
  assert.match(source, /kind\?:\s*AccessKind;\s*accessKind:\s*AccessKind/);
  assert.doesNotMatch(source, /kind\?:[^\n]*string/);
});

test("uses stable activity id when equivalent offsets represent the same instant", () => {
  const accessRecords = [{ id: "offset-tie", email: "offset@example.com", kind: "paid", status: "active", grantedAt: "2026-07-09T00:00:00Z" }];
  const activities = [
    { id: "offset-a", kind: "access", status: "failed", accessId: "offset-tie", createdAt: "2026-07-11T01:00:00Z" },
    { id: "offset-b", kind: "access", status: "success", accessId: "offset-tie", createdAt: "2026-07-11T08:00:00+07:00" },
  ];
  const forward = build({ accessRecords, activities });
  const reversed = build({ accessRecords, activities: [...activities].reverse() });
  assert.deepEqual(forward.accessHealth, reversed.accessHealth);
  assert.deepEqual(forward.priorityTasks, reversed.priorityTasks);
  assert.equal(forward.accessHealth.find((row) => row.status === "error").count, 0);
  assert.equal(forward.priorityTasks.filter((task) => task.kind === "access").length, 0);
});

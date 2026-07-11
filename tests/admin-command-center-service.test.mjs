import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

function runTs(source) {
  return JSON.parse(execFileSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", source],
    { cwd: process.cwd(), encoding: "utf8" },
  ));
}

test("range cap accepts 366 inclusive days and defaults a 367 day query", () => {
  const result = runTs(`
    import { MAX_COMMAND_CENTER_RANGE_DAYS, resolveCommandCenterRange } from "./services/adminCommandCenterService.ts";
    const now = new Date("2026-07-10T17:30:00Z");
    console.log(JSON.stringify({
      max: MAX_COMMAND_CENTER_RANGE_DAYS,
      accepted: resolveCommandCenterRange({ from: "2025-07-11", to: "2026-07-11" }, now),
      rejected: resolveCommandCenterRange({ from: "2025-07-10", to: "2026-07-11" }, now),
    }));
  `);
  assert.deepEqual(result, {
    max: 366,
    accepted: { from: "2025-07-11", to: "2026-07-11" },
    rejected: { from: "2026-06-12", to: "2026-07-11" },
  });
});

test("analysis window includes the selected range and immediately preceding equal period in Vietnam", () => {
  const result = runTs(`
    import { getCommandCenterAnalysisWindow } from "./lib/admin/command-center-source.ts";
    console.log(JSON.stringify(getCommandCenterAnalysisWindow(
      { from: "2026-07-10", to: "2026-07-11" },
      new Date("2026-07-11T05:00:00Z"),
    )));
  `);
  assert.deepEqual(result, {
    analysisFrom: "2026-07-08T00:00:00+07:00",
    analysisToExclusive: "2026-07-12T00:00:00+07:00",
    stalePendingBefore: "2026-07-10T05:00:00.000Z",
  });
});

test("pagination merges every page, deduplicates stable ids, and accepts an exact complete cap", () => {
  const result = runTs(`
    import { collectCommandCenterPages } from "./lib/admin/command-center-source.ts";
    const pages = [
      { rows: [{ id: "a" }, { id: "b" }], hasMore: true },
      { rows: [{ id: "b" }, { id: "c" }], hasMore: false },
    ];
    let calls = 0;
    const merged = await collectCommandCenterPages({
      pageSize: 2, maxRows: 4, getId: (row) => row.id,
      fetchPage: async () => pages[calls++],
    });
    const exactPages = [
      { rows: [{ id: "a" }, { id: "b" }], hasMore: true },
      { rows: [{ id: "c" }, { id: "d" }], hasMore: false },
    ];
    let exactCalls = 0;
    const exact = await collectCommandCenterPages({
      pageSize: 2, maxRows: 4, getId: (row) => row.id,
      fetchPage: async () => exactPages[exactCalls++],
    });
    console.log(JSON.stringify({ merged, calls, exact, exactCalls }));
  `);
  assert.deepEqual(result, {
    merged: [{ id: "a" }, { id: "b" }, { id: "c" }],
    calls: 2,
    exact: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    exactCalls: 2,
  });
});

test("pagination throws instead of returning a misleading capped partial source", () => {
  const result = runTs(`
    import { collectCommandCenterPages } from "./lib/admin/command-center-source.ts";
    let message = "";
    try {
      const pages = [
        { rows: [{ id: "a" }, { id: "b" }], hasMore: true },
        { rows: [{ id: "c" }, { id: "d" }], hasMore: true },
      ];
      let calls = 0;
      await collectCommandCenterPages({
        pageSize: 2, maxRows: 4, getId: (row) => row.id,
        fetchPage: async () => pages[calls++],
      });
    } catch (error) { message = error instanceof Error ? error.message : "unknown"; }
    console.log(JSON.stringify({ message }));
  `);
  assert.match(result.message, /incomplete/i);
});

test("every command-center provider receives the resolved range and shared analysis window", () => {
  const result = runTs(`
    import { getSoloCommandCenterModel } from "./services/adminCommandCenterService.ts";
    const seen = {};
    const providers = Object.fromEntries(["orders", "leads", "courses", "students", "activities"].map((name) => [
      name,
      async (context) => { seen[name] = context; return []; },
    ]));
    await getSoloCommandCenterModel(
      { from: "2026-07-10", to: "2026-07-11" },
      providers,
      new Date("2026-07-11T05:00:00Z"),
    );
    console.log(JSON.stringify(seen));
  `);
  const expected = {
    range: { from: "2026-07-10", to: "2026-07-11" },
    window: {
      analysisFrom: "2026-07-08T00:00:00+07:00",
      analysisToExclusive: "2026-07-12T00:00:00+07:00",
      stalePendingBefore: "2026-07-10T05:00:00.000Z",
    },
  };
  for (const source of ["orders", "leads", "courses", "students", "activities"]) {
    assert.deepEqual(result[source], expected);
  }
});

test("settled source adapter isolates every rejected source and treats empty success as ready", () => {
  const result = runTs(`
    import { resolveCommandCenterSettledSources } from "./services/adminCommandCenterService.ts";
    const empty = { status: "fulfilled", value: [] };
    const names = ["orders", "leads", "courses", "students", "activities"];
    console.log(JSON.stringify(Object.fromEntries(names.map((failed) => {
      const sources = Object.fromEntries(names.map((name) => [name, name === failed ? { status: "rejected", reason: new Error(name + " down") } : empty]));
      return [failed, resolveCommandCenterSettledSources(sources)];
    }))));
  `);
  for (const failed of ["orders", "leads", "courses", "students", "activities"]) {
    const expected = { orders: "ready", leads: "ready", courses: "ready", students: "ready", activities: "ready" };
    expected[failed] = "error";
    assert.deepEqual(result[failed].dataStatus, expected);
    for (const source of Object.keys(expected)) assert.deepEqual(result[failed][source], []);
  }
});

test("command center preserves sanitized runtime diagnostics for rejected sources", () => {
  const service = readFileSync("services/adminCommandCenterService.ts", "utf8");
  assert.match(service, /console\.error\("\[command-center\] source unavailable",/);
  assert.match(service, /source: sourceName/);
  assert.match(service, /message: reason instanceof Error \? reason\.message : "Unknown source error"/);
});

test("enrollment adapter requires paid course identity or explicit trial provenance", () => {
  const result = runTs(`
    import { mapCommandCenterEnrollment } from "./services/adminCommandCenterService.ts";
    const enrollment = { id: "e1", contactId: "c1", userId: "u1", email: "USER@example.com", phone: "090 123 4567", courseSlug: "course-a", status: "active", activatedAt: "2026-07-09T10:00:00+07:00", createdAt: "2026-07-08T10:00:00+07:00", expiresAt: null, accessKind: null };
    const paidSame = { id: "o1", orderCode: "TA1", email: "user@example.com", status: "paid", amount: 1, createdAt: "2026-07-01T00:00:00Z", courseSlug: "course-a", orderItems: [] };
    const paidOther = { ...paidSame, id: "o2", courseSlug: "course-b" };
    console.log(JSON.stringify({
      same: mapCommandCenterEnrollment(enrollment, [paidSame]),
      other: mapCommandCenterEnrollment(enrollment, [paidOther]),
      expiringFree: mapCommandCenterEnrollment({ ...enrollment, userId: null, expiresAt: "2026-07-20T00:00:00Z" }, []),
      trial: mapCommandCenterEnrollment({ ...enrollment, userId: null, expiresAt: "2026-07-20T00:00:00Z", accessKind: "trial" }, []),
      paidWins: mapCommandCenterEnrollment({ ...enrollment, accessKind: "trial", orderId: "o1" }, [paidSame]),
      free: mapCommandCenterEnrollment({ ...enrollment, userId: null, expiresAt: null }, []),
    }));
  `);
  assert.equal(result.same.studentId, "c1");
  assert.equal(result.same.kind, "paid");
  assert.equal(result.same.firstAccessAt, "2026-07-09T10:00:00+07:00");
  assert.equal(result.other.kind, "free");
  assert.equal(result.expiringFree.kind, "free");
  assert.equal(result.trial.kind, "trial");
  assert.equal(result.paidWins.kind, "paid");
  assert.equal(result.free.kind, "free");
});

test("paid bundle course slug matches every trimmed deduplicated course", () => {
  const result = runTs(`
    import { mapCommandCenterEnrollment } from "./services/adminCommandCenterService.ts";
    const base = { id: "e", contactId: "c", userId: "u", email: "bundle@example.com", phone: "", status: "active", activatedAt: "2026-07-09T10:00:00Z", createdAt: "2026-07-09T10:00:00Z", expiresAt: null, accessKind: null };
    const order = { id: "o", orderCode: "TA-BUNDLE", email: "bundle@example.com", phone: "", status: "paid", amount: 1, createdAt: "2026-07-01T00:00:00Z", courseSlug: " course-a, course-b,course-a, ", orderItems: [] };
    console.log(JSON.stringify({
      a: mapCommandCenterEnrollment({ ...base, id: "ea", courseSlug: "course-a" }, [order]).kind,
      b: mapCommandCenterEnrollment({ ...base, id: "eb", courseSlug: "course-b" }, [order]).kind,
      c: mapCommandCenterEnrollment({ ...base, id: "ec", courseSlug: "course-c" }, [order]).kind,
    }));
  `);
  assert.deepEqual(result, { a: "paid", b: "paid", c: "free" });
});

test("activity bounds use Vietnam calendar boundaries and clamp limit", () => {
  const result = runTs(`
    import { getCommandCenterActivityQuery } from "./services/activityLogService.ts";
    console.log(JSON.stringify({
      normal: getCommandCenterActivityQuery({ from: "2026-07-01", to: "2026-07-11", limit: 50 }),
      clamped: getCommandCenterActivityQuery({ from: "2026-07-01", to: "2026-07-11", limit: 999 }),
    }));
  `);
  assert.deepEqual(result.normal, {
    from: "2026-06-30T17:00:00.000Z",
    to: "2026-07-11T16:59:59.999Z",
    limit: 50,
  });
  assert.equal(result.clamped.limit, 200);
});

test("chart boundary retry clears fallback, calls refresh, and resetKey clears errors", () => {
  const result = runTs(`
    import { ChartErrorBoundary } from "./components/admin/solo-command-center/chart-error-boundary.tsx";
    let retries = 0;
    const boundary = new ChartErrorBoundary({ children: "chart", resetKey: "new", onRetry: () => { retries += 1; } });
    boundary.setState = (next) => { boundary.state = { ...boundary.state, ...next }; };
    boundary.state = { hasError: true };
    const fallback = boundary.render();
    const button = fallback.props.children.props.children[1];
    button.props.onClick();
    const afterRetry = boundary.state.hasError;
    boundary.state = { hasError: true };
    boundary.componentDidUpdate({ children: "chart", resetKey: "old", onRetry: () => {} });
    console.log(JSON.stringify({ retries, afterRetry, afterResetKey: boundary.state.hasError }));
  `);
  assert.deepEqual(result, { retries: 1, afterRetry: false, afterResetKey: false });
});

test("runtime providers read real leads and orders once without synthesizing leads", () => {
  const result = runTs(`
    import { getSoloCommandCenterModel } from "./services/adminCommandCenterService.ts";
    const calls = { orders: 0, leads: 0, courses: 0, students: 0, activities: 0 };
    const order = { id: "o1", orderCode: "TA1", email: "order-only@example.com", phone: "", studentName: "Order Only", courseSlug: "course-a", courseTitle: "A", amount: 100, amountLabel: "100", currency: "VND", status: "paid", paymentMethod: "", paymentQrUrl: "", paidAt: "2026-07-10T00:00:00Z", expiresAt: null, createdAt: "2026-07-10T00:00:00Z", sepayReferenceCode: null, orderItems: [], leadId: null, paymentEmailSentAt: "2026-07-10T01:00:00Z" };
    const providers = {
      orders: async () => { calls.orders += 1; return [order]; },
      leads: async () => { calls.leads += 1; return []; },
      courses: async () => { calls.courses += 1; return []; },
      students: async () => { calls.students += 1; return []; },
      activities: async () => { calls.activities += 1; return []; },
    };
    const model = await getSoloCommandCenterModel({ from: "2026-07-01", to: "2026-07-11" }, providers, new Date("2026-07-11T05:00:00Z"));
    console.log(JSON.stringify({ calls, newLeads: model.kpis.newLeads.value, funnelLeads: model.funnel.rows.find((row) => row.stage === "lead").count }));
  `);
  assert.deepEqual(result, {
    calls: { orders: 1, leads: 1, courses: 1, students: 1, activities: 1 },
    newLeads: 0,
    funnelLeads: 0,
  });
});

test("order provider rejection does not change a successful lead source", () => {
  const result = runTs(`
    import { getSoloCommandCenterModel } from "./services/adminCommandCenterService.ts";
    const providers = {
      orders: async () => { throw new Error("orders down"); },
      leads: async () => [{ id: "lead-1", email: "lead@example.com", phone: "", createdAt: "2026-07-10T00:00:00Z" }],
      courses: async () => [], students: async () => [], activities: async () => [],
    };
    const model = await getSoloCommandCenterModel({ from: "2026-07-01", to: "2026-07-11" }, providers, new Date("2026-07-11T05:00:00Z"));
    console.log(JSON.stringify({ status: model.dataStatus, leads: model.kpis.newLeads.value }));
  `);
  assert.equal(result.status.orders, "error");
  assert.equal(result.status.leads, "ready");
  assert.equal(result.leads, 1);
});

test("enrollment provenance prefers exact order, then explicit kind, then legacy heuristic", () => {
  const result = runTs(`
    import { mapCommandCenterEnrollment } from "./services/adminCommandCenterService.ts";
    const enrollment = { id: "e", contactId: "contact", userId: "user", email: "same@example.com", phone: "", courseSlug: "course-a", status: "active", activatedAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z", expiresAt: null, accessKind: null, orderId: null };
    const paid = { id: "paid", orderCode: "PAID", email: "same@example.com", phone: "", status: "paid", courseSlug: "course-a", orderItems: [] };
    const pending = { ...paid, id: "pending", orderCode: "PENDING", status: "pending" };
    console.log(JSON.stringify({
      exact: mapCommandCenterEnrollment({ ...enrollment, email: "different@example.com", orderId: "paid" }, [paid]).kind,
      explicitTrial: mapCommandCenterEnrollment({ ...enrollment, accessKind: "trial" }, [paid]).kind,
      explicitFree: mapCommandCenterEnrollment({ ...enrollment, accessKind: "free" }, [paid]).kind,
      explicitPaid: mapCommandCenterEnrollment({ ...enrollment, accessKind: "paid" }, []).kind,
      linkedPending: mapCommandCenterEnrollment({ ...enrollment, orderId: "pending" }, [pending]).kind,
      legacy: mapCommandCenterEnrollment(enrollment, [paid]).kind,
      stableId: mapCommandCenterEnrollment(enrollment, []).studentId,
    }));
  `);
  assert.deepEqual(result, {
    exact: "paid", explicitTrial: "trial", explicitFree: "free", explicitPaid: "paid",
    linkedPending: "free", legacy: "paid", stableId: "contact",
  });
});

test("same contact remains one student when user linkage changes", () => {
  const result = runTs(`
    import { getSoloCommandCenterModel } from "./services/adminCommandCenterService.ts";
    const base = { contactId: "contact-1", email: "same@example.com", phone: "", courseSlug: "course-a", status: "active", activatedAt: "2026-07-09T00:00:00Z", createdAt: "2026-07-09T00:00:00Z", expiresAt: null, accessKind: "free", orderId: null };
    const providers = { orders: async () => [], leads: async () => [], courses: async () => [], activities: async () => [], students: async () => [{ ...base, id: "e1", userId: null }, { ...base, id: "e2", userId: "user-later", activatedAt: "2026-07-10T00:00:00Z" }] };
    const model = await getSoloCommandCenterModel({ from: "2026-07-01", to: "2026-07-11" }, providers, new Date("2026-07-11T05:00:00Z"));
    console.log(JSON.stringify({ students: model.kpis.newStudents.value, growth: model.studentGrowth.reduce((sum, row) => sum + row.count, 0) }));
  `);
  assert.deepEqual(result, { students: 1, growth: 1 });
});

test("selected task helper returns controlled guidance and no fake unsupported detail", () => {
  const result = runTs(`
    import { getSelectedPriorityTaskDetail } from "./lib/admin/priority-task-detail.ts";
    const task = { id: "task-opaque", severity: "critical", kind: "email", title: "Email cần xử lý", detail: "Dấu mốc gửi email chưa thành công", href: "/admin/dashboard", createdAt: "2026-07-10T00:00:00Z" };
    console.log(JSON.stringify({
      selected: getSelectedPriorityTaskDetail([task], "task-opaque", { from: "2026-07-01", to: "2026-07-11" }),
      missing: getSelectedPriorityTaskDetail([task], "unsupported", { from: "2026-07-01", to: "2026-07-11" }),
    }));
  `);
  assert.equal(result.selected.task.id, "task-opaque");
  assert.match(result.selected.guidance, /email/i);
  assert.equal(result.selected.closeHref, "/admin/dashboard?from=2026-07-01&to=2026-07-11#viec-can-xu-ly");
  assert.equal(result.missing, null);
});

test("historical task navigation preserves range in open and close URLs", () => {
  const result = runTs(`
    import { buildPriorityTaskHref, getSelectedPriorityTaskDetail } from "./lib/admin/priority-task-detail.ts";
    const range = { from: "2025-01-03", to: "2025-02-14" };
    const task = { id: "task/id?opaque", severity: "warning", kind: "pending-order", title: "Đơn cần xử lý", detail: "Đơn chưa hoàn tất", href: "/admin/dashboard", createdAt: "2025-02-01T00:00:00Z" };
    const openHref = buildPriorityTaskHref(task.id, range);
    const selected = getSelectedPriorityTaskDetail([task], task.id, range);
    const open = new URL(openHref, "https://example.test");
    const close = new URL(selected.closeHref, "https://example.test");
    console.log(JSON.stringify({
      openHref,
      open: { from: open.searchParams.get("from"), to: open.searchParams.get("to"), task: open.searchParams.get("task"), hash: open.hash },
      selectedId: selected.task.id,
      close: { from: close.searchParams.get("from"), to: close.searchParams.get("to"), task: close.searchParams.get("task"), hash: close.hash },
    }));
  `);
  assert.deepEqual(result.open, { from: "2025-01-03", to: "2025-02-14", task: "task/id?opaque", hash: "#viec-can-xu-ly" });
  assert.equal(result.selectedId, "task/id?opaque");
  assert.deepEqual(result.close, { from: "2025-01-03", to: "2025-02-14", task: null, hash: "#viec-can-xu-ly" });
  assert.ok(!result.openHref.includes("@"));
});

test("current-month preset follows generatedAt in Vietnam instead of historical range", () => {
  const result = runTs(`
    import { getVietnamCurrentMonthRange } from "./lib/admin/command-center-date.ts";
    console.log(JSON.stringify(getVietnamCurrentMonthRange("2026-08-31T18:00:00Z")));
  `);
  assert.deepEqual(result, { from: "2026-09-01", to: "2026-09-01" });
});

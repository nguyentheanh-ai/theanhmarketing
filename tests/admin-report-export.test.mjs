import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

function runTs(source) {
  return JSON.parse(execFileSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", source],
    { cwd: process.cwd(), encoding: "utf8" },
  ));
}

test("priority filter keeps only a selected task that remains visible", () => {
  const result = runTs(`
    import { filterPriorityQueue } from "./lib/admin/priority-queue-view.ts";
    const tasks = [
      { id: "critical-1", severity: "critical" },
      { id: "warning-1", severity: "warning" },
      { id: "info-1", severity: "info" },
    ];
    console.log(JSON.stringify({
      all: filterPriorityQueue(tasks, "unsupported", "warning-1"),
      visible: filterPriorityQueue(tasks, "warning", "warning-1"),
      hidden: filterPriorityQueue(tasks, "critical", "warning-1"),
    }));
  `);

  assert.deepEqual(result.all, { severity: "all", tasks: [
    { id: "critical-1", severity: "critical" },
    { id: "warning-1", severity: "warning" },
    { id: "info-1", severity: "info" },
  ], selectedTaskId: "warning-1" });
  assert.deepEqual(result.visible, {
    severity: "warning",
    tasks: [{ id: "warning-1", severity: "warning" }],
    selectedTaskId: "warning-1",
  });
  assert.deepEqual(result.hidden, {
    severity: "critical",
    tasks: [{ id: "critical-1", severity: "critical" }],
  });
});

test("priority queue availability never turns a source error into an empty state", () => {
  const result = runTs(`
    import { getPriorityQueueAvailability } from "./lib/admin/priority-queue-view.ts";
    const ready = { orders: "ready", students: "ready", activities: "ready" };
    console.log(JSON.stringify({
      error: getPriorityQueueAvailability({ ...ready, orders: "error" }, 0),
      empty: getPriorityQueueAvailability(ready, 0),
      populated: getPriorityQueueAvailability(ready, 2),
    }));
  `);
  assert.deepEqual(result, { error: "error", empty: "empty", populated: "ready" });
});

test("aggregate CSV has BOM, exact headers, Vietnamese aggregate rows, and CRLF", () => {
  const result = runTs(`
    import { createAggregateReportCsv } from "./lib/admin/report-export.ts";
    const model = {
      range: { from: "2026-07-01", to: "2026-07-11" },
      kpis: {
        revenue: { value: 1200000 }, paidOrders: { value: 3 },
        newStudents: { value: 2 }, newLeads: { value: 5 },
      },
      topCourses: [{ slug: "advanced-course", title: "Khóa học, nâng cao", revenue: 900000, paidOrders: 2 }],
    };
    const csv = createAggregateReportCsv(model);
    console.log(JSON.stringify({ csv, first: csv.codePointAt(0), lines: csv.slice(1).split("\\r\\n") }));
  `);

  assert.equal(result.first, 0xfeff);
  assert.equal(result.lines[0], "Loại,Nhãn,Giá trị,Từ ngày,Đến ngày");
  assert.equal(result.lines.length, 7);
  assert.match(result.csv, /KPI,Doanh thu đã thanh toán,1200000,2026-07-01,2026-07-11/);
  assert.match(result.csv, /Khóa học,"Khóa học, nâng cao - Doanh thu",900000/);
  assert.match(result.csv, /Khóa học,"Khóa học, nâng cao - Đơn đã thanh toán",2/);
  assert.doesNotMatch(result.csv, /(?<!\r)\n/);
});

test("course labels never expose a slug or internal key as the display title", () => {
  const result = runTs(`
    import { createAggregateReportCsv } from "./lib/admin/report-export.ts";
    import { safeCourseDisplayTitle, toSafeTopCourseDisplayRows } from "./lib/admin/course-display.ts";
    const rows = [
      { slug: "internal-course-id", title: "internal-course-id", revenue: 10, paidOrders: 1 },
      { slug: "another-internal-key", title: "   ", revenue: 20, paidOrders: 2 },
      { slug: "safe-slug", title: "  Khóa học thật  ", revenue: 30, paidOrders: 3 },
    ];
    const model = {
      range: { from: "2026-07-01", to: "2026-07-11" },
      kpis: {
        revenue: { value: 60 }, paidOrders: { value: 6 },
        newStudents: { value: 0 }, newLeads: { value: 0 },
      },
      topCourses: rows,
    };
    console.log(JSON.stringify({
      labels: rows.map(safeCourseDisplayTitle),
      chartRows: toSafeTopCourseDisplayRows(rows),
      csv: createAggregateReportCsv(model),
    }));
  `);

  assert.deepEqual(result.labels, ["Khóa học chưa xác định", "Khóa học chưa xác định", "Khóa học thật"]);
  assert.deepEqual(result.chartRows.map((row) => row.title), ["Khóa học chưa xác định", "Khóa học chưa xác định", "Khóa học thật"]);
  assert.doesNotMatch(JSON.stringify(result.chartRows), /internal-course-id|another-internal-key/);
  assert.doesNotMatch(result.csv, /internal-course-id|another-internal-key/);
  assert.match(result.csv, /Khóa học chưa xác định - Doanh thu/);
  assert.match(result.csv, /Khóa học thật - Đơn đã thanh toán/);
});

test("CSV escaping handles quotes commas newlines and every Excel formula prefix", () => {
  const result = runTs(`
    import { escapeAggregateCsvCell } from "./lib/admin/report-export.ts";
    const values = ['a"b,c\\r\\nd', "=SUM(1,2)", "+1", "-2", "@x", "\\tcmd", "\\rcmd", "\\n=SUM(1,2)", "safe"];
    console.log(JSON.stringify(values.map(escapeAggregateCsvCell)));
  `);
  assert.deepEqual(result, [
    '"a""b,c\r\nd"',
    '"\'=SUM(1,2)"',
    "'+1",
    "'-2",
    "'@x",
    "'\tcmd",
    '"\'\rcmd"',
    '"\'\n=SUM(1,2)"',
    "safe",
  ]);
});

test("private report JSON responses are no-store for forbidden and unavailable outcomes", () => {
  const result = runTs(`
    import { createPrivateNoStoreJson } from "./lib/admin/report-response.ts";
    const forbidden = createPrivateNoStoreJson({ ok: false }, 403);
    const unavailable = createPrivateNoStoreJson({ ok: false }, 503);
    console.log(JSON.stringify({
      forbidden: { status: forbidden.status, cache: forbidden.headers.get("cache-control"), type: forbidden.headers.get("content-type") },
      unavailable: { status: unavailable.status, cache: unavailable.headers.get("cache-control") },
    }));
  `);
  assert.deepEqual(result, {
    forbidden: { status: 403, cache: "private, no-store", type: "application/json; charset=utf-8" },
    unavailable: { status: 503, cache: "private, no-store" },
  });
});

test("aggregate export fails closed with safe source labels and contains no forbidden fields", () => {
  const result = runTs(`
    import { getUnavailableAggregateSources } from "./lib/admin/report-export.ts";
    const ready = { orders: "ready", leads: "ready", courses: "ready", students: "ready", activities: "error" };
    const failed = { ...ready, orders: "error", leads: "error", courses: "error", students: "error" };
    console.log(JSON.stringify({ ready: getUnavailableAggregateSources(ready), failed: getUnavailableAggregateSources(failed) }));
  `);
  assert.deepEqual(result.ready, []);
  assert.deepEqual(result.failed, ["Đơn hàng", "Leads", "Khóa học", "Học viên"]);

  const source = execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", `import fs from "node:fs"; console.log(fs.readFileSync("lib/admin/report-export.ts", "utf8"))`],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.doesNotMatch(source, /email|phone|password|token|metadata|notes?/i);
});

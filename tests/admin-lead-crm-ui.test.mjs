import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("lead CRM page uses the light management page header instead of the legacy header", () => {
  const source = read("app/admin/leads/page.tsx");

  assert.doesNotMatch(source, /AdminPageHeader/);
  assert.match(source, /Lead CRM/);
  assert.match(source, /CRM gọn/);
  assert.match(source, /border-slate-200/);
  assert.match(source, /text-slate-950/);
  assert.match(source, /max-w-\[1480px\]/);
});

test("lead manager summarizes remarketing payloads instead of dumping raw tracking logs", () => {
  const source = read("components/admin/lead-manager.tsx");

  assert.match(source, /function summarizeLeadNeed/);
  assert.match(source, /orderCode/);
  assert.match(source, /courseTitle/);
  assert.match(source, /trackingBadges/);
  assert.match(source, /Mã đơn/);
  assert.match(source, /Khóa \/ mã đơn/);
  assert.match(source, /useDeferredValue/);
  assert.match(source, /filteredLeads/);
  assert.doesNotMatch(source, /max-w-sm text-black\/65">\{lead\.need/);
});

test("lead table puts created date at the beginning and keeps name cell compact", () => {
  const source = read("components/admin/lead-manager.tsx");
  const headerStart = source.indexOf("<thead");
  const headerEnd = source.indexOf("</thead>", headerStart);
  const header = source.slice(headerStart, headerEnd);
  const rowStart = source.indexOf("<tr className=\"border-t border-slate-100");
  const rowEnd = source.indexOf("</tr>", rowStart);
  const row = source.slice(rowStart, rowEnd);

  assert.ok(header.indexOf("Ngày tạo") < header.indexOf("Họ tên"));
  assert.ok(row.indexOf("formatAdminDate(lead.createdAt)") < row.indexOf("lead.name"));
  assert.doesNotMatch(source, /Lead từ landing\/checkout; xem nhãn tracking bên dưới/);
  assert.doesNotMatch(row, /summary\.shortNote/);
});

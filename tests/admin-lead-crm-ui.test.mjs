import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("lead CRM page uses the light management page header instead of the legacy header", () => {
  const page = read("app/admin/leads/page.tsx");
  const source = read("components/admin/lead-manager.tsx");

  assert.doesNotMatch(page, /AdminPageHeader/);
  assert.match(source, /Quản lý Lead/);
  assert.match(source, /khách hàng tiềm năng/);
  assert.match(source, /Tổng số lead/);
  assert.match(source, /Đã thanh toán/);
  assert.match(source, /Chưa thanh toán/);
  assert.match(source, /Chưa liên hệ/);
  assert.match(source, /border-slate-200/);
  assert.match(source, /text-slate-950/);
  assert.match(page, /max-w-\[1480px\]/);
});

test("lead manager summarizes remarketing payloads instead of dumping raw tracking logs", () => {
  const source = read("components/admin/lead-manager.tsx");

  assert.match(source, /function summarizeLeadNeed/);
  assert.match(source, /orderCode/);
  assert.match(source, /courseTitle/);
  assert.match(source, /trackingBadges/);
  assert.match(source, /Mã đơn/);
  assert.match(source, /getCourseCode/);
  assert.match(source, /Khóa học/);
  assert.match(source, /Bank/);
  assert.match(source, /Sale/);
  assert.match(source, /aria-label=\{`Lọc cột \$\{label\}`\}/);
  assert.match(source, /columnFilterOpen/);
  assert.match(source, /mailFilter/);
  assert.match(source, /detailLead/);
  assert.match(source, /pageSizeOptions/);
  assert.match(source, /actionMenuLeadId/);
  assert.match(source, /Xóa lead/);
  assert.match(source, /useDeferredValue/);
  assert.match(source, /filteredLeads/);
  assert.doesNotMatch(source, /max-w-sm text-black\/65">\{lead\.need/);
});

test("lead table puts created date at the beginning and keeps name cell compact", () => {
  const source = read("components/admin/lead-manager.tsx");
  const headerStart = source.indexOf("<thead");
  const headerEnd = source.indexOf("</thead>", headerStart);
  const header = source.slice(headerStart, headerEnd);
  const rowStart = source.indexOf("<tr className=\"group border-t border-slate-100");
  const rowEnd = source.indexOf("</tr>", rowStart);
  const row = source.slice(rowStart, rowEnd);

  assert.ok(header.indexOf("Thời gian") < header.indexOf("Tên"));
  assert.match(row, /formatShortDate\(lead\.createdAt\)/);
  assert.match(row, /max-w-\[190px\] truncate font-black text-slate-950/);
  assert.match(row, /\{courseCode\}/);
  assert.doesNotMatch(source, /Lead từ landing\/checkout; xem nhãn tracking bên dưới/);
  assert.doesNotMatch(row, /summary\.shortNote/);
});

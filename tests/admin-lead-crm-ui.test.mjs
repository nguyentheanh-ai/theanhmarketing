import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("lead CRM page uses the dark Growth OS page header instead of the legacy light header", () => {
  const source = read("app/admin/leads/page.tsx");

  assert.doesNotMatch(source, /AdminPageHeader/);
  assert.match(source, /Lead CRM/);
  assert.match(source, /CRM gọn/);
  assert.match(source, /max-w-\[1480px\]/);
});

test("lead manager summarizes remarketing payloads instead of dumping raw tracking logs", () => {
  const source = read("components/admin/lead-manager.tsx");

  assert.match(source, /function summarizeLeadNeed/);
  assert.match(source, /orderCode/);
  assert.match(source, /courseTitle/);
  assert.match(source, /trackingBadges/);
  assert.match(source, /Mã đơn/);
  assert.match(source, /Khóa học/);
  assert.match(source, /Ghi chú ngắn/);
  assert.doesNotMatch(source, /max-w-sm text-black\/65">\{lead\.need/);
});

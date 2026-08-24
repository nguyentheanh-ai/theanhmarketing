import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260824120000_publish_agent_kit_lessons.sql",
  "utf8",
);

test("publishes only the reviewed Đội ngũ nhân sự AI lessons by stable course slug", () => {
  assert.match(migration, /bo-agent-kit-x10-hieu-suat-cong-viec/);
  assert.match(migration, /status\s*=\s*'published'/);
  assert.match(migration, /published_at\s*=\s*coalesce\(published_at,\s*now\(\)\)/);
  assert.match(migration, /Cài đặt và đưa dữ liệu doanh nghiệp vào hệ thống/);
  assert.match(migration, /Giao việc cho 8 Nhân viên AI/);
  assert.match(migration, /Kiểm tra đầu ra, lưu SOP và vận hành quảng cáo theo quy trình/);
  assert.doesNotMatch(migration, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});

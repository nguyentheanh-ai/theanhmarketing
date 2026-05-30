import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin facebook ads report renders visual ads revenue charts without CDN chart scripts", () => {
  const client = read("components/admin/product-ads-report-client.tsx");

  assert.match(client, /from "recharts"/);
  assert.match(client, /AdsRevenueCharts/);
  assert.match(client, /ResponsiveContainer/);
  assert.match(client, /BarChart/);
  assert.match(client, /LineChart/);
  assert.match(client, /PieChart/);
  assert.match(client, /Doanh thu \/ chi phí/);
  assert.match(client, /Lead & click/);
  assert.match(client, /Phân bổ chi phí/);
  assert.match(client, /CPL & ME\/RE/);
  assert.match(client, /chartRows/);
  assert.doesNotMatch(client, /cdn\.jsdelivr|chart\.js/i);
});

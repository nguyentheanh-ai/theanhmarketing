import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

describe("admin performance guardrails", () => {
  it("keeps admin Supabase reads on explicit field selections", () => {
    const services = [
      "services/blogService.ts",
      "services/databaseHealthService.ts",
      "services/leadService.ts",
      "services/orderService.ts",
      "services/resourceService.ts",
      "services/testimonialService.ts",
    ].map(read).join("\n");

    assert.equal(services.includes('.select("*")'), false);
    assert.equal(services.includes(".select('*')"), false);
  });

  it("keeps admin lead table rows memoized", () => {
    const leadManager = read("components/admin/lead-manager.tsx");

    assert.match(leadManager, /memo\(/);
    assert.match(leadManager, /LeadTableRow/);
    assert.match(leadManager, /useCallback/);
  });

  it("keeps dashboard summary data memoized without eager heavy tab derivations", () => {
    const dashboard = read("components/admin/admin-growth-os-dashboard.tsx");

    assert.match(dashboard, /type DashboardSummaryData/);
    assert.match(dashboard, /useMemo<DashboardSummaryData>/);

    const summaryMemo = dashboard.match(/useMemo<DashboardSummaryData>\(\(\) => \{[\s\S]*?\}, \[orders, students\]\)/)?.[0] ?? "";
    assert.equal(summaryMemo.includes("buildCrmRows"), false);
    assert.equal(summaryMemo.includes("buildClickEventAnalytics"), false);
    assert.match(dashboard, /activeTab !== "dashboard" && activeTab !== "crm"/);
    assert.match(dashboard, /activeTab !== "clicks"/);
  });

  it("keeps order mutations invalidating admin caches", () => {
    const routes = [
      "app/api/orders/route.ts",
      "app/api/orders/from-session/route.ts",
      "app/api/sepay/webhook/route.ts",
      "app/api/orders/expire/route.ts",
    ];

    for (const route of routes) {
      assert.match(read(route), /invalidateAdminModules/);
    }
  });

  it("keeps admin-facing source strings free of mojibake", () => {
    const files = [
      "app/admin/don-hang/page.tsx",
      "app/admin/leads/page.tsx",
      "app/api/admin/leads/route.ts",
      "app/api/admin/students/access/route.ts",
      "app/api/admin/students/grant/route.ts",
      "components/admin/admin-growth-os-dashboard.tsx",
      "components/admin/lead-manager.tsx",
      "services/orderService.ts",
    ];
    const badTextPattern = /\uFFFD|Ã|Â|Æ|Ä/;

    for (const file of files) {
      assert.equal(badTextPattern.test(read(file)), false, file);
    }
  });
});

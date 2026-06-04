import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const sourcePath = path.resolve("public/ladipage/facebook-ads-2026.html");
const publishedPath = path.resolve("public/academy/facebook-ads-master-2026.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("Facebook Ads landing source and published route stay synced", () => {
  assert.equal(read(sourcePath), read(publishedPath));
});

test("Facebook Ads landing auto-selects pricing cards on hover or focus", () => {
  const html = read(sourcePath);

  assert.match(html, /data-plan-card="video" tabindex="0"/);
  assert.match(html, /data-plan-card="zoom-kit" tabindex="0"/);
  assert.match(html, /document\.querySelectorAll\("\[data-plan-card\]"\)\.forEach/);
  assert.match(html, /card\.addEventListener\("mouseenter", selectHoveredPlan\)/);
  assert.match(html, /card\.addEventListener\("focusin", selectHoveredPlan\)/);
  assert.match(html, /setSelectedPlan\(card\.getAttribute\("data-plan-card"\)\)/);
});

test("Facebook Ads landing keeps the existing order API contract for both plans", () => {
  const html = read(sourcePath);

  assert.match(html, /slug:\s*"facebook-ads-2026"/);
  assert.match(html, /amount:\s*399000/);
  assert.match(html, /amount:\s*799000/);
  assert.match(html, /paymentPlan:\s*selectedPlan\.id/);
  assert.match(html, /landingPage:\s*"academy\/facebook-ads-master-2026"/);
  assert.match(html, /fetch\("\/api\/orders"/);
  assert.match(html, /payload\.order\.orderCode/);
});

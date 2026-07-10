import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

function parseAdminNavItems(shell) {
  const navGroupsSource = shell.match(/const adminNavGroups = \[([\s\S]*?)\] satisfies Array</)?.[1];
  assert.ok(navGroupsSource, "adminNavGroups source must be available to verify its exact contract");

  return [...navGroupsSource.matchAll(
    /\{\s*label:\s*"([^"]+)",\s*href:\s*"([^"]+)",\s*icon:\s*"[^"]+",\s*allowedRoles:\s*\[([^\]]*)\]\s*\}/g,
  )].map((match) => ({
    label: match[1],
    href: match[2],
    allowedRoles: [...match[3].matchAll(/"([^"]+)"/g)].map((role) => role[1]),
  }));
}

test("the complete admin entry chain defaults to the solo command center", () => {
  const index = read("app/admin/page.tsx");
  const dashboard = read("app/admin/dashboard/page.tsx");

  assert.match(index, /redirect\("\/admin\/dashboard"\)/);
  assert.match(dashboard, /AdminOverviewDashboard/);
  assert.match(dashboard, /ProtectedAdminShell/);

  for (const [file, source] of [
    ["app/admin/page.tsx", index],
    ["app/admin/dashboard/page.tsx", dashboard],
  ]) {
    assert.doesNotMatch(source, /isCrmV2Enabled|\/admin\/crm-v2/, `${file} must not redirect the solo entry chain to CRM V2`);
  }
});

test("owner shell exposes the approved solo navigation", () => {
  const shell = read("components/app/admin-shell.tsx");
  const navItems = parseAdminNavItems(shell);

  const ownerItems = navItems
    .filter((item) => item.allowedRoles.includes("owner"))
    .map(({ label, href }) => ({ label, href }));

  assert.deepEqual(ownerItems, [
    { label: "Tổng quan", href: "/admin/dashboard" },
    { label: "Việc cần xử lý", href: "/admin/viec-can-xu-ly" },
    { label: "Học viên", href: "/admin/hoc-vien" },
    { label: "Đơn hàng", href: "/admin/don-hang" },
    { label: "Leads", href: "/admin/leads" },
    { label: "Khóa học", href: "/admin/khoa-hoc" },
    { label: "Báo cáo", href: "/admin/bao-cao" },
    { label: "Cài đặt", href: "/admin/cai-dat" },
  ]);

  assert.doesNotMatch(shell, /Team|Automation|Segments|Integrations/);
});

test("editor shell and settings preserve the approved role boundaries", () => {
  const shell = read("components/app/admin-shell.tsx");
  const settings = read("app/admin/cai-dat/page.tsx");
  const editorItems = parseAdminNavItems(shell)
    .filter((item) => item.allowedRoles.includes("editor"))
    .map(({ label, href }) => ({ label, href }));

  assert.deepEqual(editorItems, [
    { label: "Học viên", href: "/admin/hoc-vien" },
    { label: "Khóa học", href: "/admin/khoa-hoc" },
  ]);
  assert.match(settings, /allowedRoles=\{\["owner"\]\}/);
});

test("transition routes keep solo navigation functional until full pages land", () => {
  for (const [file, target] of [
    ["app/admin/viec-can-xu-ly/page.tsx", "/admin/dashboard#viec-can-xu-ly"],
    ["app/admin/bao-cao/page.tsx", "/admin/dashboard#bao-cao"],
  ]) {
    const source = read(file);
    const redirectTargets = [...source.matchAll(/redirect\("([^"]+)"\)/g)].map((match) => match[1]);

    assert.deepEqual(redirectTargets, [target]);
    assert.doesNotMatch(source, /\/admin\/crm-v2|TODO|placeholder|<[A-Za-z]/i);
  }
});

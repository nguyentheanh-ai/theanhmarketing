import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("public navigation contains only the approved destinations", () => {
  const site = read("data/site.ts");
  const header = read("components/site/header.tsx");
  const footer = read("components/site/footer.tsx");

  for (const item of ["Dịch vụ", "Khóa học", "Tài liệu", "Workshop"]) {
    assert.match(site, new RegExp(`label: "${item}"`));
  }
  assert.doesNotMatch(site, /label: "Trang chủ"/);
  assert.match(header, /<Link href="\/"/);
  assert.doesNotMatch(site, /label: "Hệ thống"|label: "Học viên"|label: "Blog"/);
  assert.doesNotMatch(footer, /\/he-sinh-thai|\/gioi-thieu|\/doi-tac|\/lien-he|\/blog|\/hoc-vien|\/ky-nang/);
});

test("services page presents exactly three Marketing and AI services", () => {
  assert.equal(existsSync("app/dich-vu/page.tsx"), true);
  assert.equal(existsSync("data/services.ts"), true);
  const page = read("app/dich-vu/page.tsx");
  const services = read("data/services.ts");

  assert.match(services, /Học Offline 1 kèm 1 tại TP\.HCM/);
  assert.match(services, /Training doanh nghiệp Online\/Offline/);
  assert.match(services, /Khóa học chuyên sâu 1 kèm 1/);
  assert.equal((services.match(/id: "/g) ?? []).length, 3);
  assert.match(page, /marketingAiServices/);
  assert.doesNotMatch(page, /Growth System|Operating System|Engine|Dashboard/);
});

test("legacy public routes are physically removed", () => {
  const removed = [
    "app/he-sinh-thai/page.tsx",
    "app/gioi-thieu/page.tsx",
    "app/doi-tac/page.tsx",
    "app/lien-he/page.tsx",
    "app/blog/page.tsx",
    "app/blog/[slug]/page.tsx",
    "app/hoc-vien/page.tsx",
    "app/ky-nang/page.tsx",
  ];

  for (const path of removed) assert.equal(existsSync(path), false, `${path} must be removed`);
});

test("resources is a real page and retained pages do not link to removed routes", () => {
  const resources = read("app/tai-lieu/page.tsx");
  const workshop = read("app/workshop/page.tsx");
  const home = read("data/home.ts");

  assert.match(resources, /getResources/);
  assert.doesNotMatch(resources, /redirect\("\/blog/);
  assert.doesNotMatch(`${workshop}\n${home}`, /\/he-sinh-thai|\/hoc-vien|\/blog/);
});

test("public sitemap advertises only the approved public information architecture", () => {
  const sitemap = read("app/sitemap.ts");
  for (const route of ["/gioi-thieu", "/he-sinh-thai", "/doi-tac", "/blog", "/hoc-vien", "/lien-he"]) {
    assert.doesNotMatch(sitemap, new RegExp(`["][${route[0]}]${route.slice(1)}["]`));
  }
  for (const route of ["/dich-vu", "/khoa-hoc", "/tai-lieu", "/workshop"]) {
    assert.match(sitemap, new RegExp(`["][${route[0]}]${route.slice(1)}["]`));
  }
  assert.doesNotMatch(sitemap, /getBlogPosts/);

  const jsonLd = read("components/seo/json-ld.tsx");
  assert.doesNotMatch(jsonLd, /SearchAction[\s\S]*\/blog\?search=/);
});

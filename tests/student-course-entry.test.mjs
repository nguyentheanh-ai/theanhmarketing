import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const jsx = (type, props) => ({ type, props });
const kit = "bo-agent-kit-x10-hieu-suat-cong-viec";
const fba = "facebook-ads-2026";
const ebook = "ebook-facebook-ads-2026";
const expectedHref = (slug) => slug === kit ? "/dashboard/agents" : slug === ebook ? "/thu-vien/facebook-ads" : `/learn/${slug}`;

function load(file, overrides = {}) {
  if (file.endsWith(".css")) return new Proxy({}, { get: (_, key) => key });
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const cjsModule = { exports: {} };
  new Function("exports", "module", "require", compiled)(cjsModule.exports, cjsModule, (name) => {
    if (name in overrides) return overrides[name];
    if (name.startsWith("@/") || name.startsWith(".")) {
      const base = name.startsWith("@/") ? name.slice(2) : path.join(path.dirname(file), name);
      const target = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (!target) throw new Error(`Missing test import: ${name}`);
      return load(target, overrides);
    }
    return require(name);
  });
  return cjsModule.exports;
}

function nodes(tree) {
  const result = [];
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (typeof node.type === "function") return walk(node.type(node.props));
    result.push(node);
    walk(node.props?.children);
  }
  walk(tree);
  return result;
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join("");
  if (node && typeof node === "object") return text(node.props?.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}
const uiDeps = {
  react: { useState: (initial) => [initial, () => {}] },
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "next/link": { default: "a", __esModule: true },
  "next/image": { default: "img", __esModule: true },
  "@/components/cart/add-to-cart-button": { AddToCartButton: () => null },
  "@/components/auth/sign-out-button": { SignOutButton: () => null },
  "@/components/site/brand-mark": { BrandMark: () => null },
};
const catalog = load("data/courses.ts");
const courses = catalog.courses.filter((course) => [fba, kit, ebook].includes(course.slug));
function dashboard(ownedSlugs, suppliedCourses = courses) {
  const { StudentDashboard } = load("components/app/student-dashboard.tsx", uiDeps);
  return nodes(StudentDashboard({ courses: suppliedCourses, ownedSlugs, progressBySlug: {}, resources: [], studentName: "Test", studentEmail: "student@example.invalid" }));
}

test("FBA and Agent Kit both appear as owned and every owned card link opens its learning destination", () => {
  assert.equal(courses.length, 3);
  const rendered = dashboard([fba, kit, fba]);
  const courseSection = rendered.find((node) => node.props?.id === "khoa-hoc");
  const cards = nodes(courseSection).filter((node) => node.type === "article");
  assert.equal(cards.length, 2);
  assert.ok(text(cards[0]).includes(courses.find((course) => course.slug === fba).title));
  assert.ok(text(cards[1]).includes(courses.find((course) => course.slug === kit).title));
  const suggestions = rendered.find((node) => node.props?.["aria-label"] === "Chương trình khác");
  assert.ok(rendered.indexOf(courseSection) < rendered.indexOf(suggestions));
  const ownedCards = rendered.filter((node) => node.type === "article" && text(node).includes("Đã sở hữu"));
  assert.equal(ownedCards.length, 2);
  for (const slug of [fba, kit]) {
    const course = courses.find((item) => item.slug === slug);
    const card = ownedCards.find((node) => text(node).includes(course.title));
    const links = nodes(card).filter((node) => node.type === "a");
    assert.ok(links.length >= 2);
    for (const link of links) assert.equal(link.props.href, expectedHref(slug));
  }
});

test("portal keeps both paid-order and LMS-granted courses in one deduplicated list", async () => {
  const { getStudentPortalSnapshot } = load("services/studentPortalService.ts", {
    "@/lib/auth/session": { getCurrentAuth: async () => ({ user: { id: "test-user", email: "student@example.invalid", user_metadata: {} }, adminRole: null }), isAuthGuardEnabled: () => true },
    "@/lib/admin/admin-emails": { getConfiguredOwnerEmails: () => [] },
    "@/services/courseService": { getCourses: async () => courses },
    "@/services/resourceService": { getResources: async () => [] },
    "@/services/studentPortalAccessService": { getStudentPortalAccessRecords: async () => ({ leads: [], orders: [{ email: "student@example.invalid", status: "paid", courseSlug: fba, courseTitle: "Facebook Ads", orderItems: [] }] }) },
    "@/services/lmsService": { getStudentLmsAccess: async () => ({ ownedSlugs: [kit, fba], progressBySlug: { [fba]: 20 } }) },
  });
  const snapshot = await getStudentPortalSnapshot();
  assert.deepEqual(snapshot.ownedSlugs, [fba, kit]);
  assert.equal(snapshot.ownedCourses.length, 2);
  assert.equal(snapshot.progressBySlug[fba], 20);
});

test("FBA entry resolves the first published lesson in module order", async () => {
  const publishedCourse = {
    modules: [
      { title: "Later module", order: 2, lessons: [{ id: "later-module-first", order: 1 }] },
      { title: "First module", order: 1, lessons: [{ id: "first-module-second", order: 20 }, { id: "first-module-first", order: 10 }] },
    ],
  };
  const { default: CourseLearningPage } = load("app/learn/[course]/page.tsx", {
    "next/navigation": { redirect: (href) => { throw new Error(`REDIRECT:${href}`); }, notFound: () => { throw new Error("NOT_FOUND"); } },
    "@/services/courseService": { getPublishedCourseForStudent: async () => publishedCourse },
  });
  await assert.rejects(CourseLearningPage({ params: Promise.resolve({ course: fba }) }), { message: `REDIRECT:/learn/${fba}/first-module-first` });
});

test("Agent Kit with no LMS lessons still opens its library from the card and featured actions", () => {
  const emptyKit = courses.map((course) => course.slug === kit ? { ...course, modules: [] } : course);
  const rendered = dashboard([kit], emptyKit);
  for (const label of ["Tiếp tục học", "Mở khóa học "]) {
    const link = rendered.find((node) => node.type === "a" && text(node) === label);
    assert.equal(link?.props.href, expectedHref(kit));
  }
  const card = rendered.find((node) => node.type === "article" && text(node).includes("Đã sở hữu"));
  assert.ok(nodes(card).filter((node) => node.type === "a").every((node) => node.props.href === expectedHref(kit)));
});

test("unowned courses never get a learning CTA or become the featured owned course", () => {
  const rendered = dashboard([]);
  assert.equal(rendered.filter((node) => node.type === "article" && text(node).includes("Đã sở hữu")).length, 0);
  assert.equal(rendered.filter((node) => node.type === "a" && String(node.props.href).startsWith("/learn/")).length, 0);
  const { getPrimaryDashboardCourse } = load("lib/student-dashboard-courses.ts");
  assert.equal(getPrimaryDashboardCourse(courses, []), null);
});

test("Ebook reader and PDF remain available for an owned Ebook", () => {
  const card = dashboard([ebook]).find((node) => node.type === "article" && text(node).includes("Đã sở hữu"));
  const links = nodes(card).filter((node) => node.type === "a");
  assert.equal(links.find((node) => text(node) === "Đọc online")?.props.href, "/thu-vien/facebook-ads");
  assert.equal(links.find((node) => text(node) === "Tải PDF")?.props.href, "/thu-vien/facebook-ads/pdf");
});

test("account course list opens each owned course directly", async () => {
  const { default: AccountPage } = load("app/tai-khoan/page.tsx", {
    ...uiDeps,
    "@/components/account/account-profile-form": { AccountProfileForm: () => null },
    "@/components/site/page-shell": { PageShell: ({ children }) => children },
    "@/lib/auth/session": { requireStudentAuth: async () => {} },
    "@/services/studentPortalService": { getStudentPortalSnapshot: async () => ({ displayName: "Test", email: "student@example.invalid", phone: "", ownedCourses: courses }) },
  });
  const rendered = nodes(await AccountPage());
  for (const course of courses) {
    const link = rendered.find((node) => node.type === "a" && text(node) === course.title);
    assert.equal(link?.props.href, expectedHref(course.slug));
  }
});


test("unreleased courses are gray even with an existing grant, without removing that grant", () => {
  const upcomingCourses = courses.map((course) => ({ ...course, status: course.slug === kit ? "coming-soon" : "open" }));
  const rendered = dashboard([fba, kit], upcomingCourses);
  const cards = rendered.filter((node) => node.type === "article");
  const ownedFba = cards.find((node) => text(node).includes(upcomingCourses.find((course) => course.slug === fba).title));
  const ownedKit = cards.find((node) => text(node).includes(upcomingCourses.find((course) => course.slug === kit).title));
  assert.doesNotMatch(ownedFba.props.className, /grayscale/);
  assert.match(ownedKit.props.className, /grayscale/);
  assert.ok(text(ownedKit).includes("Chưa mở bán"));
  assert.equal(nodes(ownedKit).find((node) => node.type === "a" && text(node) === "Vào học")?.props.href, expectedHref(kit));
});

test("legacy Agent links redirect into the student area", () => {
  const { default: Page } = load("app/learn/bo-agent-kit-x10-hieu-suat-cong-viec/agents/page.tsx", {
    "next/navigation": { redirect: href => { throw new Error(`redirect:${href}`); } },
  });
  assert.throws(() => Page(), /redirect:\/dashboard\/agents/);
});
for (const [status, allowed] of [[401, false], [403, false], [200, true]]) {
  test(`student Agent page preserves access boundary: ${status}`, async () => {
    const { default: Page } = load("app/dashboard/agents/page.tsx", {
      ...uiDeps,
      "next/navigation": { redirect: href => { throw new Error(`redirect:${href}`); } },
      "@/lib/agent-library-access": { AGENT_LIBRARY_HREF: "/dashboard/agents", requireAgentLibraryAccess: async () => allowed ? {ok:true} : {ok:false,status} },
      "@/components/agent-library/agent-library": { AgentLibrary: () => jsx("section", {"data-private-library":true}) },
      "@/components/app/student-area-shell": { StudentAreaShell: ({children}) => children },
    });
    if (status === 401) return assert.rejects(Page(), /next=%2Fdashboard%2Fagents/);
    const rendered = nodes(await Page());
    assert.equal(rendered.some(node => node.props?.["data-private-library"]), allowed);
  });
}

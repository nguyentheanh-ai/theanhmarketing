import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const page = read("app/page.tsx");
const shell = read("components/site/page-shell.tsx");
const header = read("components/site/header.tsx");
const footer = read("components/site/footer.tsx");
const courseCard = read("components/content/course-card.tsx");
const css = read("app/globals.css");

test("public shell uses the approved light The Anh visual surface", () => {
  assert.match(shell, /tam-public-shell/);
  assert.doesNotMatch(shell, /ai-os-bg/);
  assert.match(css, /\.tam-public-shell/);
  assert.match(css, /--tam-accent:/);
  assert.match(css, /--tam-ink:/);
  assert.match(css, /\.tam-grid-bg/);
});

test("public header keeps navigation, account, cart, and a mobile menu", () => {
  assert.match(header, /mainNav\.map/);
  assert.match(header, /HeaderAuthActions/);
  assert.match(header, /CartLink/);
  assert.match(header, /MobileMenu/);
  assert.match(header, /tam-public-header/);
});

test("homepage renders the approved conversion story in order", () => {
  const anchors = [
    "growth-hero",
    "growth-stats",
    "growth-problems",
    "growth-engines",
    "growth-demo",
    "growth-products",
    "growth-proof",
    "growth-faq",
    "growth-cta",
  ];

  let previousIndex = -1;
  for (const anchor of anchors) {
    const index = page.indexOf(`id=\"${anchor}\"`);
    assert.ok(index > previousIndex, `${anchor} must appear after the preceding homepage section`);
    previousIndex = index;
  }
});

test("homepage keeps products service-driven and FAQ accessible", () => {
  assert.match(page, /getCourses\(\)/);
  assert.match(page, /courses\.slice\(/);
  assert.doesNotMatch(page, /9\s+sản phẩm|9\s+khóa học/i);
  assert.match(page, /FaqAccordion/);
  assert.match(page, /faqs=\{faqs\}/);
});

test("course cards retain real course data and use the light interactive card", () => {
  assert.match(courseCard, /course\.title/);
  assert.match(courseCard, /course\.price/);
  assert.match(courseCard, /AddToCartButton/);
  assert.match(courseCard, /tam-course-card/);
  assert.match(courseCard, /tam-lift/);
  assert.match(courseCard, /tam-media-zoom/);
});

test("motion is progressive and reduced-motion safe", () => {
  assert.match(css, /\.tam-reveal/);
  assert.match(css, /\.tam-stagger/);
  assert.match(css, /\.tam-lift/);
  assert.match(css, /\.tam-media-zoom/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("footer remains connected to real brand contact and public routes", () => {
  assert.match(footer, /getBrandSettings/);
  assert.match(footer, /brand\.phone/);
  assert.match(footer, /brand\.email/);
  assert.match(footer, /\/khoa-hoc/);
  assert.match(footer, /\/blog/);
  assert.match(footer, /tam-public-footer/);
});

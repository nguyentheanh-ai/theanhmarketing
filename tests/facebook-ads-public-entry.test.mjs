import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(relativePath, "utf8");
}

function configBlock(source, slug) {
  const start = source.indexOf(`slug: "${slug}"`);
  assert.notEqual(start, -1, `Missing course config for ${slug}`);
  const end = source.indexOf("\n  },", start);
  assert.notEqual(end, -1, `Missing end of course config for ${slug}`);
  return source.slice(start, end);
}

test("public Facebook Ads course entry uses the 799.000đ landing instead of generic cart checkout", () => {
  const courses = read("data/courses.ts");
  const facebookAds = configBlock(courses, "facebook-ads-2026");
  const ebook = configBlock(courses, "ebook-facebook-ads-2026");
  const catalog = read("components/site/course-catalog-grid.tsx");
  const osGrid = read("components/site/ai-os-visuals.tsx");
  const courseCard = read("components/content/course-card.tsx");
  const courseRoute = read("app/khoa-hoc/[slug]/page.tsx");

  assert.match(facebookAds, /price:\s*"799\.000đ"/);
  assert.match(facebookAds, /landingPageUrl:\s*"\/academy\/facebook-ads-master-2026"/);
  assert.doesNotMatch(facebookAds, /price:\s*"399\.000đ"/);

  assert.match(ebook, /price:\s*"399\.000đ"/);
  assert.doesNotMatch(ebook, /landingPageUrl:\s*"\/academy\/facebook-ads-master-2026"/);

  for (const surface of [catalog, osGrid, courseCard]) {
    assert.match(surface, /course\.landingPageUrl/);
  }

  assert.match(courseRoute, /redirect\(course\.landingPageUrl\)/);
});

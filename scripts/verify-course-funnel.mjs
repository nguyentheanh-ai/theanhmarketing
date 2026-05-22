import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const coursesSource = await readFile(path.join(root, "data/courses.ts"), "utf8");
const marketingSource = await readFile(path.join(root, "data/marketing-courses.ts"), "utf8");
const homePageSource = await readFile(path.join(root, "app", "page.tsx"), "utf8");
const coursesPageSource = await readFile(path.join(root, "app", "khoa-hoc", "page.tsx"), "utf8");
const visualsSource = await readFile(path.join(root, "components", "site", "ai-os-visuals.tsx"), "utf8");
const catalogSource = await readFile(path.join(root, "components", "site", "course-catalog-grid.tsx"), "utf8");

const expectedCourses = [
  ["facebook-ads-2026", "Quảng cáo Facebook Master 2026", "399K", "quang-cao-facebook-master-2026.webp"],
  ["tao-ai-agent-ca-nhan-x10-hieu-suat", "Tạo AI Agent cá nhân X10 hiệu suất", "99K", "tao-ai-agent-ca-nhan-x10-hieu-suat.webp"],
  ["ai-marketing-x5-hieu-suat-cong-viec", "AI Marketing x5 hiệu suất công việc", "199K", "ai-marketing-x5-hieu-suat-cong-viec.webp"],
  ["ai-agent-master-2026", "AI Agent Master 2026", "799K", "ai-agent-master-2026.webp"],
  ["performance-marketing-with-ai", "Performance Marketing With AI", "799K", "performance-marketing-with-ai.webp"],
  ["bo-agent-kit-x10-hieu-suat-cong-viec", "Bộ Agent Kit X10 hiệu suất công việc", "799K", "bo-agent-kit-x10-hieu-suat-cong-viec.webp"],
  ["bien-tri-thuc-thanh-tien", "Biến tri thức thành tiền", "1.299K", "bien-tri-thuc-thanh-tien.webp"],
  ["ai-master-x10-hieu-suat", "AI Master x10 hiệu suất", "1.299K", "ai-master-x10-hieu-suat.webp"],
  ["marketing-gioi-phai-kiem-duoc-tien", "Marketing giỏi phải kiếm được tiền", "2.199K", "marketing-gioi-phai-kiem-duoc-tien.webp"],
];

const failures = [];

for (const [slug, title, price, fileName] of expectedCourses) {
  const thumbnail = `/course-thumbnails/${fileName}`;
  const thumbnailPath = path.join(root, "public", "course-thumbnails", fileName);

  if (!coursesSource.includes(`slug: "${slug}"`)) failures.push(`Missing slug: ${slug}`);
  if (!coursesSource.includes(`title: "${title}"`)) failures.push(`Missing title: ${title}`);
  if (!coursesSource.includes(`price: "${price}"`)) failures.push(`Missing price ${price} for ${title}`);
  if (!coursesSource.includes(`thumbnailImageUrl: "${thumbnail}"`)) failures.push(`Missing thumbnail ${thumbnail}`);
  if (!existsSync(thumbnailPath)) {
    failures.push(`Missing optimized image: ${thumbnailPath}`);
  } else {
    const size = statSync(thumbnailPath).size;
    if (size > 260_000) {
      failures.push(`Image too large (${size} bytes): ${fileName}`);
    }
  }
}

const demoTerms = [
  "AI Growth System Program",
  "AI Content Engine",
  "CRM & Data Layer",
  "Funnel Psychology Foundation",
  "AI Solopreneur OS",
  "AI Growth System Foundation",
  "marketing-online-nen-tang",
];

for (const term of demoTerms) {
  if (coursesSource.includes(term) || marketingSource.includes(term)) {
    failures.push(`Demo course still present: ${term}`);
  }
}

for (const oldTier of ["Giá rẻ", "Giá trung", "Giá cao"]) {
  if (coursesSource.includes(oldTier) || catalogSource.includes(oldTier)) {
    failures.push(`Old funnel price tier is still public: ${oldTier}`);
  }
}

for (const learningLevel of ["Cơ bản", "Nâng cao", "Chuyên sâu"]) {
  if (!coursesSource.includes(`tier: "${learningLevel}"`)) {
    failures.push(`Missing learning level: ${learningLevel}`);
  }
}

if (!coursesPageSource.includes('variant="catalog"')) {
  failures.push("Public course page is not using the catalog card layout");
}

if (!homePageSource.includes('variant="catalog" showFilters={false}')) {
  failures.push("Homepage course section is not using the compact catalog layout");
}

for (const token of ["course-catalog-image", "course-catalog-price-row", "course-catalog-actions"]) {
  if (!catalogSource.includes(token)) failures.push(`Missing catalog UI token: ${token}`);
}

for (const token of ["showFilters", "showToolbar", "useState", "filteredCourses", "priceRanges", "setFilter"]) {
  if (!catalogSource.includes(token)) failures.push(`Missing interactive filter token: ${token}`);
}

if (!visualsSource.includes("CourseCatalogGrid")) {
  failures.push("Module catalog is not using the interactive catalog component");
}

if (catalogSource.includes("Sắp xếp theo")) {
  failures.push("Course catalog still shows the right-side sort label");
}

if (failures.length > 0) {
  console.error("Course funnel verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Course funnel verification passed.");

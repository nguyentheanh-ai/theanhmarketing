import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const coursesSource = await readFile(path.join(root, "data/courses.ts"), "utf8");
const marketingSource = await readFile(path.join(root, "data/marketing-courses.ts"), "utf8");

const expectedCourses = [
  ["facebook-ads-2026", "Quảng cáo Facebook Master 2026", "99K", "quang-cao-facebook-master-2026.webp"],
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

if (failures.length > 0) {
  console.error("Course funnel verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Course funnel verification passed.");

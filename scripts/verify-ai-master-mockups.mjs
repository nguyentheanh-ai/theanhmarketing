import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = [
  {
    path: "public/ladipage/ai-master-x10-hieu-suat.html",
    assetPrefix: "../academy/ai-master-x10-assets",
  },
  {
    path: "public/academy/ai-master-x10-hieu-suat.html",
    assetPrefix: "ai-master-x10-assets",
  },
];
const mockups = [
  "ai-workspace-output.webp",
  "content-calendar-output.webp",
  "student-dashboard-output.webp",
  "landing-page-output.webp",
  "crm-mini-output.webp",
  "process-pack-output.webp",
  "module-sheet-output.webp",
  "module-media-output.webp",
  "module-sales-output.webp",
  "instructor-the-anh.webp",
  "bonus-prompt.webp",
  "bonus-content.webp",
  "bonus-script.webp",
  "bonus-ads.webp",
  "bonus-community.webp",
];
const mediaAssets = [];
const assetDir = "public/academy/ai-master-x10-assets";
const sampleOutputDir = `${assetDir}/sample-outputs`;
const sampleOutputs = [
  "01-ai-workspace-setup.md",
  "02-content-calendar-30-ngay.md",
  "03-landing-page-checklist.md",
  "04-crm-mini-pipeline.md",
  "05-beta-launch-7-14-ngay.md",
  "06-roadmap-30-90-ngay.md",
];

const failures = [];

for (const file of files) {
  const path = join(root, file.path);
  const html = readFileSync(path, "utf8");

  for (const mockup of mockups) {
    const expected = `${file.assetPrefix}/${mockup}`;
    if (!html.includes(expected)) {
      failures.push(`${file.path} is missing ${expected}`);
    }
  }

  for (const sampleOutput of sampleOutputs) {
    const expected = `${file.assetPrefix}/sample-outputs/${sampleOutput}`;
    if (!html.includes(expected)) {
      failures.push(`${file.path} is missing ${expected}`);
    }
  }

  for (const mediaAsset of mediaAssets) {
    const expected = `${file.assetPrefix}/${mediaAsset}`;
    if (!html.includes(expected)) {
      failures.push(`${file.path} is missing ${expected}`);
    }
  }

  for (const staleText of ["Chỉ số năng lực sau khóa học", "Biểu đồ này", "Câu hỏi thường gặp"]) {
    if (html.includes(staleText)) {
      failures.push(`${file.path} still includes stale section text: ${staleText}`);
    }
  }
}

for (const mockup of mockups) {
  const path = join(root, assetDir, mockup);
  if (!existsSync(path)) {
    failures.push(`${assetDir}/${mockup} does not exist`);
  }
}

for (const sampleOutput of sampleOutputs) {
  const path = join(root, sampleOutputDir, sampleOutput);
  if (!existsSync(path)) {
    failures.push(`${sampleOutputDir}/${sampleOutput} does not exist`);
  }
}

for (const mediaAsset of mediaAssets) {
  const path = join(root, assetDir, mediaAsset);
  if (!existsSync(path)) {
    failures.push(`${assetDir}/${mediaAsset} does not exist`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `AI Master mockups verified: ${mockups.length} assets, ${mediaAssets.length} media files and ${sampleOutputs.length} sample files referenced in ${files.length} HTML files.`,
);

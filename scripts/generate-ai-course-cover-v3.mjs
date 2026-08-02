import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";
import { fileURLToPath } from "node:url";

const generatedRoot = "/Users/theanh/.codex/generated_images/019fc12b-3cc5-79d1-89e7-5cc52db192a9";
const outputRoot = fileURLToPath(new URL("../public/course-thumbnails/", import.meta.url));

const covers = [
  {
    slug: "ai-master-x10-hieu-suat",
    source: "exec-e169de28-b113-4a8f-b3ac-b8c250048629.png",
    lines: ["AI Master", "X10 hiệu suất"],
    subtitle: "Biến tri thức thành tiền",
    colors: ["#075FEA", "#7C3AED"],
    accent: "#6D28D9",
    size: 80,
  },
  {
    slug: "bo-agent-kit-x10-hieu-suat-cong-viec",
    source: "exec-f5077450-ca6f-41c5-96ac-1681f939d70e.png",
    lines: ["Bộ Agent Kit", "X10 hiệu suất", "công việc"],
    subtitle: "AI Agent cho Marketing và vận hành",
    colors: ["#075FEA", "#7C3AED", "#08A9E8"],
    accent: "#075FEA",
    size: 72,
  },
];

const escapeXml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

for (const cover of covers) {
  const lineHeight = Math.round(cover.size * 1.04);
  const title = cover.lines.map((line, index) => (
    `<text x="72" y="${250 + index * lineHeight}" fill="${cover.colors[index]}" `
    + `font-family="SF Pro Rounded, SFNS Rounded, Arial Rounded MT Bold, sans-serif" `
    + `font-size="${cover.size}" font-weight="800" letter-spacing="-3">${escapeXml(line)}</text>`
  )).join("");
  const subtitleY = 250 + cover.lines.length * lineHeight + 34;
  const subtitleWidth = cover.slug.startsWith("bo-agent") ? 500 : 390;

  const svg = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect x="72" y="92" width="320" height="54" rx="27" fill="${cover.accent}"/>
      <text x="232" y="128" text-anchor="middle" fill="#FFFFFF"
        font-family="SF Pro Rounded, SFNS Rounded, Arial Rounded MT Bold, sans-serif"
        font-size="23" font-weight="800" letter-spacing="1.4">THE ANH MARKETING</text>
      <rect x="72" y="178" width="72" height="8" rx="4" fill="${cover.accent}"/>
      ${title}
      <rect x="72" y="${subtitleY - 37}" width="${subtitleWidth}" height="58" rx="29" fill="#FFFFFF" fill-opacity="0.92"/>
      <text x="94" y="${subtitleY}" fill="${cover.accent}"
        font-family="SF Pro Rounded, SFNS Rounded, Arial Rounded MT Bold, sans-serif"
        font-size="25" font-weight="800">${escapeXml(cover.subtitle)}</text>
    </svg>
  `);

  await sharp(`${generatedRoot}/${cover.source}`)
    .resize(1024, 1024, { fit: "cover" })
    .composite([{ input: svg, top: 0, left: 0 }])
    .webp({ quality: 92, effort: 5 })
    .toFile(`${outputRoot}${cover.slug}-v3.webp`);
}

console.log(`Generated ${covers.length} AI course covers.`);

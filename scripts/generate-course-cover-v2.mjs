import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";
import { fileURLToPath } from "node:url";

const generatedRoot = "/Users/theanh/.codex/generated_images/019fc12b-3cc5-79d1-89e7-5cc52db192a9";
const outputRoot = fileURLToPath(new URL("../public/course-thumbnails/", import.meta.url));

const covers = [
  {
    slug: "quang-cao-facebook-master-2026",
    source: "exec-df645827-c695-4d51-b756-a4d071cc9a20.png",
    lines: ["Quảng cáo", "Facebook", "Master 2026"],
    colors: ["#075FEA", "#12A9F4", "#075FEA"],
    accent: "#075FEA",
    size: 82,
  },
  {
    slug: "ebook-facebook-ads-2026",
    source: "exec-fccf21a1-6c3b-4a1d-8ff3-756bd72c71cb.png",
    lines: ["Thư viện", "kiến thức", "Facebook Ads"],
    colors: ["#075FEA", "#7C3AED", "#08A9E8"],
    accent: "#075FEA",
    size: 82,
  },
  {
    slug: "tao-ai-agent-ca-nhan-x10-hieu-suat",
    source: "exec-410d745b-2a6b-4b96-8c6b-cfbfd2190a65.png",
    lines: ["Tạo AI Agent", "cá nhân", "X10 hiệu suất"],
    colors: ["#7C3AED", "#C026D3", "#5B5CF6"],
    accent: "#7C3AED",
    size: 80,
  },
  {
    slug: "ai-marketing-x5-hieu-suat-cong-viec",
    source: "exec-60874150-6e73-4d79-9295-bbaddc4fe17e.png",
    lines: ["AI Marketing", "x5 hiệu suất", "công việc"],
    colors: ["#075FEA", "#08A9E8", "#4F46E5"],
    accent: "#08A9E8",
    size: 82,
  },
  {
    slug: "ai-agent-master-2026",
    source: "exec-eeb2cfc6-7939-4d7e-a28a-0804536f5011.png",
    lines: ["AI Agent", "Master", "2026"],
    colors: ["#6D28D9", "#A21CAF", "#4F46E5"],
    accent: "#7C3AED",
    size: 90,
  },
  {
    slug: "performance-marketing-with-ai",
    source: "exec-c715dd7b-f290-462d-a945-d20f090ab686.png",
    lines: ["Performance", "Marketing", "With AI"],
    colors: ["#075FEA", "#F97316", "#06A6E8"],
    accent: "#F97316",
    size: 78,
  },
  {
    slug: "bo-agent-kit-x10-hieu-suat-cong-viec",
    source: "exec-362c41fa-c217-45d6-bec4-ce3d7f8c2549.png",
    lines: ["Bộ Agent Kit", "X10 hiệu suất", "công việc"],
    colors: ["#075FEA", "#7C3AED", "#0EA5E9"],
    accent: "#5B5CF6",
    size: 76,
  },
  {
    slug: "bien-tri-thuc-thanh-tien",
    source: "exec-93911951-1807-4458-939b-8f52259162fb.png",
    lines: ["Biến tri thức", "thành", "tài sản số"],
    colors: ["#F59E0B", "#F97316", "#7C3AED"],
    accent: "#F59E0B",
    size: 82,
  },
  {
    slug: "ai-master-x10-hieu-suat",
    source: "exec-280519b3-f5da-493d-ba59-f4171ee8e04e.png",
    lines: ["AI Master", "X10 hiệu suất", "Biến tri thức"],
    colors: ["#6D28D9", "#C026D3", "#4F46E5"],
    accent: "#7C3AED",
    size: 80,
  },
  {
    slug: "marketing-gioi-phai-kiem-duoc-tien",
    source: "exec-5d6f381b-93b2-4414-a10e-c130b97c000f.png",
    lines: ["Marketing giỏi", "phải tạo ra", "doanh thu"],
    colors: ["#F97316", "#075FEA", "#EA580C"],
    accent: "#F97316",
    size: 76,
  },
];

const escapeXml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

for (const cover of covers) {
  const lineHeight = Math.round(cover.size * 1.06);
  const title = cover.lines.map((line, index) => (
    `<text x="72" y="${260 + index * lineHeight}" fill="${cover.colors[index]}" `
    + `font-family="SF Pro Rounded, SFNS Rounded, Arial Rounded MT Bold, sans-serif" `
    + `font-size="${cover.size}" font-weight="800" letter-spacing="-3">${escapeXml(line)}</text>`
  )).join("");

  const svg = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect x="72" y="104" width="320" height="54" rx="27" fill="${cover.accent}"/>
      <text x="232" y="140" text-anchor="middle" fill="#FFFFFF"
        font-family="SF Pro Rounded, SFNS Rounded, Arial Rounded MT Bold, sans-serif"
        font-size="23" font-weight="800" letter-spacing="1.4">THE ANH MARKETING</text>
      <rect x="72" y="190" width="72" height="8" rx="4" fill="${cover.accent}"/>
      ${title}
      <rect x="72" y="590" width="250" height="58" rx="29" fill="${cover.accent}"/>
      <text x="197" y="628" text-anchor="middle" fill="#FFFFFF"
        font-family="SF Pro Rounded, SFNS Rounded, Arial Rounded MT Bold, sans-serif"
        font-size="25" font-weight="800">HỌC THỰC CHIẾN</text>
    </svg>
  `);

  await sharp(`${generatedRoot}/${cover.source}`)
    .resize(1024, 1024, { fit: "cover" })
    .composite([{ input: svg, top: 0, left: 0 }])
    .webp({ quality: 92, effort: 5 })
    .toFile(`${outputRoot}${cover.slug}-v2.webp`);
}

console.log(`Generated ${covers.length} course covers.`);

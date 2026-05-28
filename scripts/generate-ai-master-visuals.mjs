import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetDir = join(root, "public", "academy", "ai-master-x10-assets");
const thumbDir = join(assetDir, "source-thumbs");

await mkdir(assetDir, { recursive: true });

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function svgText(lines, x, y, opts = {}) {
  const {
    size = 32,
    fill = "#fff7dc",
    weight = 800,
    lineHeight = Math.round(size * 1.18),
    family = "Arial, sans-serif",
    anchor = "start",
  } = opts;
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(line)}</text>`,
    )
    .join("");
}

async function renderSvg(name, svg, width = 1400, height = 900) {
  await sharp(Buffer.from(svg)).resize(width, height).webp({ quality: 90 }).toFile(join(assetDir, name));
}

function baseSvg({ width = 1400, height = 900, accent = "#f7c948", dark = "#090907", glow = "#2b88ff" }) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <radialGradient id="g1" cx="18%" cy="18%" r="60%">
          <stop offset="0" stop-color="${glow}" stop-opacity=".34"/>
          <stop offset=".48" stop-color="${glow}" stop-opacity=".08"/>
          <stop offset="1" stop-color="${dark}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="g2" cx="86%" cy="8%" r="58%">
          <stop offset="0" stop-color="${accent}" stop-opacity=".42"/>
          <stop offset=".52" stop-color="${accent}" stop-opacity=".08"/>
          <stop offset="1" stop-color="${dark}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="line" x1="0" x2="1">
          <stop offset="0" stop-color="${accent}" stop-opacity=".08"/>
          <stop offset=".5" stop-color="${accent}" stop-opacity=".42"/>
          <stop offset="1" stop-color="${accent}" stop-opacity=".08"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="42" fill="${dark}"/>
      <rect width="100%" height="100%" rx="42" fill="url(#g1)"/>
      <rect width="100%" height="100%" rx="42" fill="url(#g2)"/>
      <g opacity=".18">
        ${Array.from({ length: 16 }, (_, i) => `<line x1="${i * 92}" y1="0" x2="${i * 92}" y2="${height}" stroke="#ffe28a" stroke-width="1"/>`).join("")}
        ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 86}" x2="${width}" y2="${i * 86}" stroke="#ffe28a" stroke-width="1"/>`).join("")}
      </g>
    `;
}

async function createInstructor() {
  const src = "F:/Anh zai.png";
  if (!existsSync(src)) return;
  await sharp(src)
    .resize({ width: 900, height: 1180, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 92 })
    .toFile(join(assetDir, "instructor-the-anh.webp"));
}

async function createSheetMockup() {
  const rows = [
    ["Phương pháp", "Link", "Kết quả cần nộp"],
    ["Insight", "Nỗi đau, mong muốn, rào cản", "Chân dung khách hàng"],
    ["Offer", "Lời hứa, bonus, giảm rủi ro", "Offer 1 trang"],
    ["Content", "Hook, angle, CTA", "Lịch 30 ngày"],
    ["Landing", "Hero, proof, price, form", "Trang bán thử"],
    ["CRM", "Lead, trạng thái, follow-up", "Pipeline mini"],
  ];
  const tableRows = rows
    .map((row, index) => {
      const y = 96 + index * 70;
      const fill = index === 0 ? "#ffd84d" : index % 2 ? "#fff9e8" : "#f1ead7";
      const color = index === 0 ? "#11100a" : "#17140d";
      return `
        <rect x="94" y="${y}" width="1212" height="64" fill="${fill}" stroke="#282014" stroke-width="2"/>
        <line x1="410" y1="${y}" x2="410" y2="${y + 64}" stroke="#282014" stroke-width="2"/>
        <line x1="878" y1="${y}" x2="878" y2="${y + 64}" stroke="#282014" stroke-width="2"/>
        ${svgText([row[0]], 116, y + 40, { size: 22, fill: color, weight: 900 })}
        ${svgText([row[1]], 432, y + 40, { size: 22, fill: color, weight: 700 })}
        ${svgText([row[2]], 900, y + 40, { size: 22, fill: color, weight: 800 })}
      `;
    })
    .join("");

  const svg = `
    ${baseSvg({ accent: "#ffe28a", glow: "#246bff" })}
      <rect x="70" y="66" width="1260" height="760" rx="32" fill="#faf6e8"/>
      ${tableRows}
      <rect x="94" y="544" width="370" height="124" fill="#fffdf5" stroke="#282014" stroke-width="2"/>
      <rect x="514" y="544" width="370" height="124" fill="#fffdf5" stroke="#282014" stroke-width="2"/>
      <rect x="934" y="544" width="370" height="124" fill="#fffdf5" stroke="#282014" stroke-width="2"/>
      ${svgText(["Đối tượng mục tiêu"], 116, 584, { size: 20, fill: "#11100a", weight: 900 })}
      ${svgText(["Vấn đề cấp bách"], 536, 584, { size: 20, fill: "#11100a", weight: 900 })}
      ${svgText(["CTA / bước kế tiếp"], 956, 584, { size: 20, fill: "#11100a", weight: 900 })}
    </svg>`;
  await renderSvg("module-sheet-output.webp", svg);
}

async function createBonusImages() {
  const bonuses = [
    ["bonus-prompt.webp", "#5bd4ff"],
    ["bonus-content.webp", "#ffd84d"],
    ["bonus-script.webp", "#ff7a45"],
    ["bonus-ads.webp", "#6bff9d"],
    ["bonus-community.webp", "#b56bff"],
  ];
  for (const [name, glow] of bonuses) {
    const nodes = Array.from({ length: 18 }, (_, i) => {
      const x = 220 + ((i * 71) % 860);
      const y = 145 + ((i * 113) % 430);
      return `<circle cx="${x}" cy="${y}" r="${8 + (i % 4) * 3}" fill="${glow}" opacity=".58"/><line x1="700" y1="420" x2="${x}" y2="${y}" stroke="${glow}" stroke-width="2" opacity=".18"/>`;
    }).join("");
    const svg = `
      ${baseSvg({ width: 1200, height: 720, accent: "#ffe28a", glow })}
        ${nodes}
        <circle cx="700" cy="420" r="78" fill="${glow}" opacity=".14"/>
        <circle cx="700" cy="420" r="28" fill="#ffe28a"/>
        <rect x="46" y="46" width="1108" height="628" rx="34" fill="none" stroke="#ffe28a" stroke-opacity=".18"/>
        <rect x="76" y="86" width="86" height="42" rx="21" fill="#ffd400"/>
        <circle cx="700" cy="420" r="132" fill="none" stroke="#ffe28a" stroke-opacity=".12" stroke-width="2"/>
        <circle cx="700" cy="420" r="220" fill="none" stroke="#ffe28a" stroke-opacity=".08" stroke-width="2"/>
      </svg>`;
    await renderSvg(name, svg, 1200, 720);
  }
}

async function createModuleCollages() {
  const safeThumb = (name) => (existsSync(join(thumbDir, name)) ? join(thumbDir, name) : join(assetDir, "process-pack-output.webp"));
  const websiteCapture = join(assetDir, "theanhmarketing-home.png");
  const module2Base = await sharp({
    create: { width: 1400, height: 900, channels: 4, background: "#070706" },
  })
    .composite([{ input: Buffer.from(baseSvg({ accent: "#ffe28a", glow: "#ff5f8a" }) + "</svg>") }])
    .png()
    .toBuffer();

  await sharp(module2Base)
    .composite([
      { input: await sharp(safeThumb("media-03.jpg")).resize(580, 326, { fit: "cover" }).toBuffer(), left: 70, top: 260 },
      { input: await sharp(safeThumb("media-01.jpg")).resize(300, 535, { fit: "cover" }).toBuffer(), left: 690, top: 230 },
      { input: await sharp(safeThumb("media-02.jpg")).resize(300, 535, { fit: "cover" }).toBuffer(), left: 1030, top: 230 },
      {
        input: Buffer.from(`
          <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900">
            ${svgText(["AI tạo hình ảnh và edit video"], 70, 120, { size: 44, fill: "#fff7dc", weight: 900, family: "Georgia, serif" })}
            ${svgText(["Quy trình sản xuất visual/video bán hàng đồng bộ."], 70, 172, { size: 24, fill: "#e8ddbd", weight: 700 })}
            <rect x="70" y="624" width="1258" height="112" rx="22" fill="#080706" stroke="#ffe28a" stroke-opacity=".34"/>
            ${svgText(["Kết quả: tự sản xuất hình ảnh và video thương hiệu cá nhân đều đặn."], 102, 688, { size: 28, fill: "#ffe28a", weight: 900 })}
          </svg>`),
      },
    ])
    .webp({ quality: 88 })
    .toFile(join(assetDir, "module-media-output.webp"));

  const module3Base = await sharp({
    create: { width: 1400, height: 900, channels: 4, background: "#070706" },
  })
    .composite([{ input: Buffer.from(baseSvg({ accent: "#ffe28a", glow: "#53ffb0" }) + "</svg>") }])
    .png()
    .toBuffer();

  await sharp(module3Base)
    .composite([
      {
        input: await sharp(existsSync(websiteCapture) ? websiteCapture : join(assetDir, "landing-page-output.webp"))
          .resize(1160, 600, { fit: "cover", position: "top" })
          .toBuffer(),
        left: 120,
        top: 220,
      },
      {
        input: Buffer.from(`
          <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900">
            <rect x="120" y="220" width="1160" height="600" rx="28" fill="none" stroke="#ffe28a" stroke-opacity=".35" stroke-width="3"/>
            <rect x="120" y="220" width="1160" height="600" rx="28" fill="url(#fadeBottom)"/>
            <defs>
              <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
                <stop offset=".58" stop-color="#000" stop-opacity="0"/>
                <stop offset="1" stop-color="#000" stop-opacity=".72"/>
              </linearGradient>
            </defs>
            ${svgText(["Website & landing thật"], 70, 118, { size: 46, fill: "#fff7dc", weight: 900, family: "Georgia, serif" })}
            ${svgText(["Từ trang thương hiệu đến trang bán, form và CRM được nối thành một flow."], 70, 172, { size: 24, fill: "#e8ddbd", weight: 700 })}
            <rect x="168" y="724" width="1020" height="66" rx="18" fill="#080706" stroke="#ffe28a" stroke-opacity=".28"/>
            ${svgText(["Kết quả: có nền tảng bán hàng online nhìn chuyên nghiệp và triển khai được ngay."], 198, 766, { size: 24, fill: "#ffe28a", weight: 900 })}
          </svg>`),
      },
    ])
    .webp({ quality: 88 })
    .toFile(join(assetDir, "module-sales-output.webp"));
}

await createInstructor();
await createSheetMockup();
await createBonusImages();
await createModuleCollages();

console.log("Generated AI Master X10 visuals.");

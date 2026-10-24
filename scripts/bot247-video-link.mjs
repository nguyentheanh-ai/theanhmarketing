// In link xem bộ video hướng dẫn Bot 24/7 cho các mã đơn (để gửi tay cho khách mua trước khi email có link video).
// Không gửi email, không đọc D1. Khóa ký = secret BOT247_VIDEO_LINK_SECRET của Worker production (bản sao trong .env.bot247-video, không commit).
// Dùng: node scripts/bot247-video-link.mjs TAMXXXX [TAMYYYY ...]
import fs from "node:fs";
import { createHmac } from "node:crypto";

const env = fs.existsSync(".env.bot247-video") ? fs.readFileSync(".env.bot247-video", "utf8") : "";
const secret = process.env.BOT247_VIDEO_LINK_SECRET || /^BOT247_VIDEO_LINK_SECRET=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!secret) throw new Error("Thiếu BOT247_VIDEO_LINK_SECRET");
// Cùng công thức với lib/bot247/video-access.ts (bot247VideoToken)
for (const raw of process.argv.slice(2)) {
  const code = raw.trim().toUpperCase();
  const sig = createHmac("sha256", secret).update(`bot247-video-guide\n${code}`).digest("base64url").slice(0, 32);
  console.log(`${code}\thttps://www.theanhmarketing.com/bot-24-7/huong-dan?k=${encodeURIComponent(`${code}.${sig}`)}`);
}

import { createHmac } from "node:crypto";

// Bộ video hướng dẫn Bot 24/7 (/bot-24-7/huong-dan): khách mua Bot không có tài khoản học viên,
// nên quyền xem là một mã riêng từng đơn: "<MÃ ĐƠN>.<chữ ký HMAC>", gửi trong email sau thanh toán.
// Khóa ký: secret BOT247_VIDEO_LINK_SECRET của Worker (bản sao cục bộ: phase2-main/.env.bot247-video). Không lưu gì thêm trong D1; muốn thu hồi một đơn thì thêm mã đơn vào biến BOT247_VIDEO_REVOKED.
export const BOT247_GUIDE_PATH = "/bot-24-7/huong-dan";
export const BOT247_DOWNLOAD_PATH = "/bot-24-7/tai-ve";

// Bộ cài (Google Drive). Chỉ trả ra sau khi kiểm mã truy cập (trang Tải về) hoặc trong email gửi riêng cho khách đã mua.
export const BOT247_INSTALLER_VERSION = "1.11.3";
export const BOT247_INSTALLERS = {
  macArm: "https://drive.google.com/file/d/1yHSvfXaIlkKqgMc0VFcGBCO5fdeBQL7r/view?usp=sharing",
  macIntel: "https://drive.google.com/file/d/1T4_obtA688K4PkWInWeBpcHqWXaiDxbE/view?usp=sharing",
  windows: "https://drive.google.com/file/d/1RJpUDfVN79QlxJD2MV4NG2roFTIKZD0F/view?usp=sharing",
};
export const BOT247_VIDEO_R2_PREFIX = "bot247/huong-dan/";

// Thêm tập mới: tải tệp lên R2 tại bot247/huong-dan/<file> rồi thêm một dòng ở đây (thứ tự = thứ tự trên trang).
export const BOT247_EPISODES = [
  { n: 1, file: "tap-01-bat-dau.mp4", title: "8 bước bắt đầu", desc: "Hồ sơ doanh nghiệp, nạp tài liệu, chọn bộ não AI, giao việc đầu tiên." },
  { n: 2, file: "tap-02-ket-noi-va-mo-hinh.mp4", title: "Kết nối kênh và chọn mô hình AI", desc: "Zalo, Messenger, Instagram, Google Drive: mỗi kênh một nút Kết nối." },
  { n: 3, file: "tap-03-giao-viec-bang-chat.mp4", title: "Giao việc bằng chat", desc: "Gõ một câu, hệ thống tự chuyển cho đúng Bot. Trợ lý góc màn hình." },
  { n: 4, file: "tap-04-bo-nao-doanh-nghiep.mp4", title: "Bộ não doanh nghiệp", desc: "Về anh, nguồn tài liệu, bản đồ tri thức, quy tắc, sổ tay." },
  { n: 5, file: "tap-05-cham-khach.mp4", title: "Chăm khách 24/7", desc: "Thử Bot như khách, dặn Bot nhanh, hộp thư chung, lịch hẹn." },
  { n: 6, file: "tap-06-lich-dang.mp4", title: "Lên lịch đăng", desc: "Facebook, Instagram, TikTok và nhiều kênh khác trên một lịch." },
  { n: 7, file: "tap-07-video.mp4", title: "Làm video", desc: "Video Reels, TikTok có giọng đọc tiếng Việt và phụ đề." },
  { n: 8, file: "tap-08-website.mp4", title: "Làm website", desc: "Landing page bán hàng: Bot làm, bạn duyệt, khách góp ý." },
] as const;

const ORDER_CODE = /^[A-Z0-9][A-Z0-9-]{2,39}$/;

export function bot247VideoToken(secret: string | undefined | null, orderCode: string) {
  const code = String(orderCode || "").trim().toUpperCase();
  if (!secret || !ORDER_CODE.test(code)) return null;
  const sig = createHmac("sha256", secret).update(`bot247-video-guide\n${code}`).digest("base64url").slice(0, 32);
  return `${code}.${sig}`;
}

/** Trả về mã đơn nếu mã truy cập hợp lệ và chưa bị thu hồi, ngược lại null. */
export function verifyBot247VideoToken(secret: string | undefined | null, token: string | null, revoked = "") {
  const value = String(token || "").trim();
  const dot = value.lastIndexOf(".");
  if (!secret || dot < 1 || value.length > 100) return null;
  const expected = bot247VideoToken(secret, value.slice(0, dot));
  if (!expected || expected.length !== value.length) return null;
  let diff = 0;
  for (let i = 0; i < value.length; i++) diff |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  const code = value.slice(0, dot);
  return revoked.split(/[\s,]+/).some((item) => item.toUpperCase() === code) ? null : code;
}

export function bot247GuideUrl(siteUrl: string, secret: string | undefined | null, orderCode: string, page = BOT247_GUIDE_PATH) {
  const token = bot247VideoToken(secret, orderCode);
  return token ? `${String(siteUrl).replace(/\/$/, "")}${page}?k=${encodeURIComponent(token)}` : null;
}

/** Link trang Tải về đã đăng nhập sẵn (cùng mã truy cập với trang video). */
export function bot247DownloadUrl(siteUrl: string, secret: string | undefined | null, orderCode: string) {
  return bot247GuideUrl(siteUrl, secret, orderCode, BOT247_DOWNLOAD_PATH);
}

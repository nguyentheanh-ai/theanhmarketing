import { serveR2Object, type PrivateR2Bucket } from "./private-r2";
import { BOT247_DOWNLOAD_PATH, BOT247_EPISODES, BOT247_GUIDE_PATH, BOT247_INSTALLERS, BOT247_INSTALLER_VERSION, BOT247_VIDEO_R2_PREFIX, verifyBot247VideoToken } from "../bot247/video-access";

export type Bot247GuideEnv = { PRIVATE_ASSETS?: PrivateR2Bucket; BOT247_VIDEO_LINK_SECRET?: string; BOT247_VIDEO_REVOKED?: string };

const LIST_PATH = `${BOT247_GUIDE_PATH}/api/tap`;
const VIDEO_PREFIX = `${BOT247_GUIDE_PATH}/video/`;
const LINKS_PATH = `${BOT247_DOWNLOAD_PATH}/api/links`;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

/** Danh sách tập (cần mã truy cập) và phát video từ R2 riêng tư; null = không phải đường dẫn của bộ video. */
export async function handleBot247GuideRequest(request: Request, env: Bot247GuideEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== LIST_PATH && url.pathname !== LINKS_PATH && !url.pathname.startsWith(VIDEO_PREFIX)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  if (!env.PRIVATE_ASSETS || !env.BOT247_VIDEO_LINK_SECRET) return json(503, { ok: false, error: "Chưa cấu hình kho video." });
  const token = url.searchParams.get("k");
  const orderCode = verifyBot247VideoToken(env.BOT247_VIDEO_LINK_SECRET, token, env.BOT247_VIDEO_REVOKED || "");

  // Trang Tải về: link bộ cài chỉ trả ra cho mã truy cập hợp lệ (cùng mã với trang video)
  if (url.pathname === LINKS_PATH) {
    if (!orderCode) return json(401, { ok: false, error: "Cần đăng nhập bằng email đã mua Bot 24/7." });
    return json(200, { ok: true, orderCode, version: BOT247_INSTALLER_VERSION, installers: BOT247_INSTALLERS, videoUrl: `${BOT247_GUIDE_PATH}?k=${encodeURIComponent(token!)}` });
  }

  if (url.pathname === LIST_PATH) {
    if (!orderCode) return json(401, { ok: false, error: "Link xem video không đúng hoặc đã hết hiệu lực." });
    const k = encodeURIComponent(token!);
    return json(200, {
      ok: true,
      orderCode,
      episodes: BOT247_EPISODES.map((e) => ({ n: e.n, title: e.title, desc: e.desc, src: `${VIDEO_PREFIX}${e.file}?k=${k}` })),
    });
  }

  const file = url.pathname.slice(VIDEO_PREFIX.length);
  if (!BOT247_EPISODES.some((e) => e.file === file)) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!orderCode) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  const response = await serveR2Object(request, env.PRIVATE_ASSETS, BOT247_VIDEO_R2_PREFIX + file, "private, max-age=3600");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

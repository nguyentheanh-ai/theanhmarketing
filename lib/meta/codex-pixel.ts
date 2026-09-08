export const CODEX_META_PIXEL_ID = "1369910554822777";
export const CODEX_LANDING_PATH = "/academy/codex-x10-hieu-suat";

// Match the landing itself, not the shared course slug or a substring in a query.
export function isCodexLanding(value?: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.startsWith("academy/") ? `/${value}` : value, "https://www.theanhmarketing.com");
    return ["www.theanhmarketing.com", "theanhmarketing.com", "localhost", "127.0.0.1"].includes(url.hostname)
      && ["https:", "http:"].includes(url.protocol)
      && url.pathname.replace(/\/$/, "") === CODEX_LANDING_PATH;
  } catch {
    return false;
  }
}

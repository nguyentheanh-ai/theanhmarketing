export const CODEX_META_PIXEL_ID = "1369910554822777";
export const CODEX_LANDING_PATH = "/academy/codex-x10-hieu-suat";
const CODEX_PIXEL_LANDING_PATHS = [CODEX_LANDING_PATH, "/academy/bo-kit-agent-doanh-nghiep"];

// Both approved landings sell the same product. Match paths, never query substrings.
export function isCodexLanding(value?: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.startsWith("academy/") ? `/${value}` : value, "https://www.theanhmarketing.com");
    return ["www.theanhmarketing.com", "theanhmarketing.com", "localhost", "127.0.0.1"].includes(url.hostname)
      && ["https:", "http:"].includes(url.protocol)
      && CODEX_PIXEL_LANDING_PATHS.includes(url.pathname.replace(/\/$/, ""));
  } catch {
    return false;
  }
}

import app from "vinext/server/fetch-handler";
import { servePrivateR2, type PrivateR2Bucket } from "./lib/cloudflare/private-r2";

// Staging-only bridge for the one public video above the Workers asset limit.
// Replace with an integrity-checked R2 source before any production cutover.
const oversizedPublicVideo = "/doi-ngu-nhan-su-ai/media/proof/editor-ai-jun-08-2026.mp4";

const stagingWorker = {
  fetch(request: Request, env: unknown, context: Parameters<typeof app.fetch>[2]) {
    const url = new URL(request.url);
    if (url.pathname === "/__cf/private-r2") {
      const bindings = env as { PRIVATE_ASSETS?: PrivateR2Bucket; R2_PRIVATE_URL_SECRET?: string };
      if (!bindings.PRIVATE_ASSETS || !bindings.R2_PRIVATE_URL_SECRET) {
        return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      return servePrivateR2(request, bindings.PRIVATE_ASSETS, bindings.R2_PRIVATE_URL_SECRET);
    }
    if (url.pathname === oversizedPublicVideo && (request.method === "GET" || request.method === "HEAD")) {
      return Response.redirect(`https://www.theanhmarketing.com${oversizedPublicVideo}`, 307);
    }
    return app.fetch(request, env, context);
  },
};

export default stagingWorker;

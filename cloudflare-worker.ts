import {protectNativeQaSourceBoundary} from './lib/cloudflare/native-source-boundary';
import {withNativePageRefresh} from "./lib/cloudflare/native-page-refresh";
import app from "vinext/server/fetch-handler";
import { servePrivateR2, serveR2Object, type PrivateR2Bucket } from "./lib/cloudflare/private-r2";
import { isCurrentStorageKey } from "./lib/cloudflare/current-storage-index";
import {handleNativeStageRequest,type NativeStageEnv} from './lib/cloudflare/native-stage-router';
import {runNativeRequestContext} from './lib/cloudflare/native-request-context';
import {protectNativeLearningResponse} from './lib/cloudflare/native-learning-response';
import {handleNativeAppBridgeRequest} from './lib/cloudflare/native-app-login-bridge';
import {handleNativeResourceRequest} from './lib/cloudflare/native-resource-http';
import {handleNativePaymentStage,type NativePaymentStageEnv} from './lib/cloudflare/native-payment-stage';
import {handleNativeEmailAuth,type NativeEmailAuthEnv} from './lib/cloudflare/native-email-auth-http';
import {runWorkerCron} from './lib/cloudflare/worker-cron';

// Exact public video path above the Workers asset limit; bytes live in R2 staging.
const oversizedPublicVideo = "/doi-ngu-nhan-su-ai/media/proof/editor-ai-jun-08-2026.mp4";
const oversizedPublicVideoKey = `public${oversizedPublicVideo}`;
// next.config rewrites to a public .html whose pretty path differs from the
// request path. Assets cannot match these, so serve the file here (Vercel parity).
const STATIC_ASSET_ALIASES: Record<string, string> = { "/academy/quang-cao-chuyen-gia": "/industry-ads/chuyen-gia" };

const stagingWorker = {
  async fetch(request: Request, env: unknown, context: Parameters<typeof app.fetch>[2]) {
    // Vercel parity once custom domains are attached: apex -> www, path and query kept.
    const incoming = new URL(request.url);
    if (incoming.hostname === "theanhmarketing.com") {
      incoming.hostname = "www.theanhmarketing.com";
      return Response.redirect(incoming.toString(), 307);
    }
    const response = await stagingWorker.route(request, env, context);
    // Test hostnames (*.workers.dev) must never be indexed next to the real domain.
    if (!new URL(request.url).hostname.endsWith('.workers.dev')) return response;
    const tagged = new Response(response.body, response);
    tagged.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return tagged;
  },
  async route(request: Request, env: unknown, context: Parameters<typeof app.fetch>[2]) {
    return withNativePageRefresh(request,env as NativeStageEnv,async request=>{
    const url = new URL(request.url);
    const alias = STATIC_ASSET_ALIASES[url.pathname];
    const assets = (env as { ASSETS?: { fetch: (input: Request) => Promise<Response> } }).ASSETS;
    if (alias && assets && (request.method === "GET" || request.method === "HEAD")) return assets.fetch(new Request(new URL(alias, url), request));
    // Default-disabled QA payment path; null keeps the existing webhook route.
    const payment=await handleNativePaymentStage(request,env as NativePaymentStageEnv,context&&'waitUntil' in context?task=>context.waitUntil(task):undefined);
    if(payment)return payment;
    // Default-disabled native signup/recovery; null keeps the existing router.
    const emailAuth=await handleNativeEmailAuth(request,env as NativeEmailAuthEnv);
    if(emailAuth)return emailAuth;
    const native=await handleNativeStageRequest(request,env as NativeStageEnv);
    if(native)return native;
    const appBridge=await handleNativeAppBridgeRequest(request,env as NativeStageEnv);
    if(appBridge)return appBridge;
    const resource=await handleNativeResourceRequest(request,env as NativeStageEnv);
    if(resource)return resource;
    if (url.pathname === "/__cf/private-r2") {
      const bindings = env as { PRIVATE_ASSETS?: PrivateR2Bucket; R2_PRIVATE_URL_SECRET?: string };
      if (!bindings.PRIVATE_ASSETS || !bindings.R2_PRIVATE_URL_SECRET) {
        return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      return servePrivateR2(request, bindings.PRIVATE_ASSETS, bindings.R2_PRIVATE_URL_SECRET,
        Date.now(), (key) => isCurrentStorageKey(bindings.PRIVATE_ASSETS!, key));
    }
    if (url.pathname === oversizedPublicVideo) {
      const bucket = (env as { PRIVATE_ASSETS?: PrivateR2Bucket }).PRIVATE_ASSETS;
      if (!bucket) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
      return serveR2Object(request, bucket, oversizedPublicVideoKey, "public, max-age=3600");
    }
    const sourceBoundary=protectNativeQaSourceBoundary(request,env as NativeStageEnv);
    if(sourceBoundary)return sourceBoundary;
    return runNativeRequestContext(request,env as NativeStageEnv,async()=>{
      const response=await app.fetch(request, env, context);
      return protectNativeLearningResponse(request,env as NativeStageEnv,response);
    });
    });
  },
  // Vercel cron parity (lib/cloudflare/worker-cron.ts); no-op unless CF_CRON_MODE=enabled.
  async scheduled(controller: { scheduledTime: number }, env: unknown, context: Parameters<typeof app.fetch>[2]) {
    const results = await runWorkerCron(controller.scheduledTime, env as Parameters<typeof runWorkerCron>[1], request => stagingWorker.fetch(request, env, context));
    for (const r of results) if (r.status >= 400) console.warn('[cron] route failed', r.path, r.status);
  },
};

export default stagingWorker;

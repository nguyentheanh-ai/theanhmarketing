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

const stagingWorker = {
  async fetch(request: Request, env: unknown, context: Parameters<typeof app.fetch>[2]) {
    return withNativePageRefresh(request,env as NativeStageEnv,async request=>{
    const url = new URL(request.url);
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

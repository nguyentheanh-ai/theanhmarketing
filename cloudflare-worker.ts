import app from "vinext/server/fetch-handler";
import { servePrivateR2, serveR2Object, type PrivateR2Bucket } from "./lib/cloudflare/private-r2";
import { isCurrentStorageKey } from "./lib/cloudflare/current-storage-index";
import {handleNativeStageRequest,type NativeStageEnv} from './lib/cloudflare/native-stage-router';
import {runNativeRequestContext} from './lib/cloudflare/native-request-context';
import {protectNativeLearningResponse} from './lib/cloudflare/native-learning-response';

// Exact public video path above the Workers asset limit; bytes live in R2 staging.
const oversizedPublicVideo = "/doi-ngu-nhan-su-ai/media/proof/editor-ai-jun-08-2026.mp4";
const oversizedPublicVideoKey = `public${oversizedPublicVideo}`;

const stagingWorker = {
  async fetch(request: Request, env: unknown, context: Parameters<typeof app.fetch>[2]) {
    const url = new URL(request.url);
    const native=await handleNativeStageRequest(request,env as NativeStageEnv);
    if(native)return native;
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
  },
};

export default stagingWorker;

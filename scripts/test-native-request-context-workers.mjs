// Synthetic context isolation in actual local workerd; no source/credentials.
import {build} from 'esbuild';import {Miniflare} from 'miniflare';import assert from 'node:assert/strict';
const bundle=await build({entryPoints:['lib/cloudflare/native-request-context.ts'],bundle:true,platform:'browser',format:'esm',external:['node:async_hooks'],write:false});
const handler=`import * as worker from './worker-context.mjs';import * as rsc from './rsc-context.mjs';
export default {fetch(request){return worker.runNativeRequestContext(request,{fixture:new URL(request.url).searchParams.get('id')},async()=>{await new Promise(resolve=>setTimeout(resolve,15));const context=rsc.getNativeRequestContext();if(!context)return new Response('missing',{status:500});return Response.json({id:context.env.fixture,cookie:context.request.headers.get('Cookie')});})}};`;
const modules={'fixture.mjs':{type:'esm',contents:handler},'worker-context.mjs':{type:'esm',contents:bundle.outputFiles[0].text},'rsc-context.mjs':{type:'esm',contents:bundle.outputFiles[0].text}};
const mf=new Miniflare({workers:[{config:{name:'context-fixture',compatibilityDate:'2026-10-13',compatibilityFlags:['nodejs_compat'],manifest:{mainModule:'fixture.mjs',modules}}}]});
try{
 const results=await Promise.all(Array.from({length:12},(_,i)=>mf.dispatchFetch('https://fixture.invalid/?id='+i,{headers:{Cookie:'synthetic='+i}}).then(async r=>{assert.equal(r.status,200);return r.json()})));
 results.forEach((r,i)=>assert.deepEqual(r,{id:String(i),cookie:'synthetic='+i}));
 console.log(JSON.stringify({status:'PASS',runtime:'local workerd',parallelRequests:12,moduleGraphs:2,limits:'ALS isolation only; no Vinext SSR, real session or hosted browser claim'}));
}finally{await mf.dispose();}

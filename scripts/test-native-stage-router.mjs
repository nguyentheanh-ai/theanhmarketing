// Router configuration tests only: no network, real credentials or data.
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'native-router-'));
try{
 await build({entryPoints:['lib/cloudflare/native-stage-router.ts'],bundle:true,platform:'node',format:'esm',outfile:join(dir,'router.mjs')});
 const {handleNativeStageRequest}=await import(pathToFileURL(join(dir,'router.mjs')));
 const origin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
 let calls=0;const db={withSession(){calls++;throw Error('No fixture binding configured')}};
 const base={CF_NATIVE_AUTH_MODE:'disabled',CF_NATIVE_AUTH_ORIGIN:origin,CF_NATIVE_QA_USERS:'[]',NATIVE_AUTH_DB:db};
 for(const path of ['/api/cloudflare-auth/login','/api/cloudflare-auth/session','/api/cloudflare-student/access','/api/cloudflare-student/progress']){const response=await handleNativeStageRequest(new Request(origin+path),base);assert.equal(response.status,503);assert.equal(response.headers.get('Set-Cookie'),null);assert.equal(response.headers.get('Cache-Control'),'private, no-store')}
 assert.equal(calls,0);
 for(const path of ['/','/learn/facebook-ads-2026/lesson','/__cf/private-r2','/api/sepay/webhook'])assert.equal(await handleNativeStageRequest(new Request(origin+path),base),null);
 const qa={...base,CF_NATIVE_AUTH_MODE:'qa'};
 assert.equal((await handleNativeStageRequest(new Request('https://www.theanhmarketing.com/api/cloudflare-auth/session'),qa)).status,503);
 assert.equal((await handleNativeStageRequest(new Request(origin+'/api/cloudflare-auth/session'),qa)).status,503);
 const cohort=JSON.stringify(['00000000-0000-4000-8000-000000000001']);
 assert.equal((await handleNativeStageRequest(new Request(origin+'/api/cloudflare-auth/session'),{...qa,CF_NATIVE_QA_USERS:cohort})).status,503);
 assert.equal(calls,0);
 const key='a'.repeat(43);assert.equal((await handleNativeStageRequest(new Request(origin+'/api/cloudflare-auth/session'),{...qa,CF_NATIVE_QA_USERS:cohort,NATIVE_AUTH_CREDENTIAL_KEY:key,NATIVE_AUTH_LIMITER_KEY:key})).status,503);assert.equal(calls,1);
 console.log('PASS native router: disabled without DB access; old routes pass through; production origin, missing cohort/keys/binding denied; no cookie mutation. Config tests only.');
}finally{rmSync(dir,{recursive:true,force:true})}

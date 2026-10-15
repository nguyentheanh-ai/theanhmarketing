// Existing dedicated QA only. Per-device logout keeps Source credential/version unchanged.
import {privateDecrypt,constants} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {observeNativeSession,requestAfterNativeGate} from './native-session-readiness.mjs';
const [keyFile,sealedFile]=process.argv.slice(2);
if(![keyFile,sealedFile].every(p=>p?.startsWith('/private/tmp/theanh-native-api-qa-')))throw Error('Private QA paths required');
const bytes=privateDecrypt({key:readFileSync(keyFile),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(JSON.parse(readFileSync(sealedFile,'utf8')).sealed,'base64'));
const access=JSON.parse(bytes.toString());bytes.fill(0);
const qa=JSON.parse(readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));
const origin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev',checks=[],jar=new Map();
const headers={'CF-Access-Client-Id':access.client_id,'CF-Access-Client-Secret':access.client_secret};
const reportFile='reports/cloudflare-d1/native-refresh-hosted-http.json',gateDelays=[];
let step='ready',lastResponse,readinessProbes=[];
const cookie=()=>[...jar].map(([k,v])=>k+'='+v).join('; ');
async function call(path,body,options={}){
 const response=await requestAfterNativeGate(()=>fetch(origin+path,{method:body===undefined?'GET':'POST',redirect:'manual',signal:AbortSignal.timeout(20000),headers:{...headers,...(cookie()?{Cookie:cookie()}:{}),...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),...options},body:body===undefined?undefined:JSON.stringify(body)}),json,{origin,path,pause:async ms=>{gateDelays.push({path,waitMs:ms});await new Promise(resolve=>setTimeout(resolve,ms));}});
 lastResponse={status:response.status,contentType:response.headers.get('content-type')};
 if(response.status!==200&&lastResponse.contentType?.startsWith('application/json')){
  try {const body=await json(response.clone());const allowed=['NATIVE_D1_DISABLED','STAGING_ORIGIN_REQUIRED','NATIVE_CONFIG_UNAVAILABLE','REFRESH_UNAVAILABLE','RATE_LIMITED','INVALID_SESSION','INVALID_REQUEST','INVALID_ORIGIN'];lastResponse.code=allowed.includes(body.code)?body.code:'OTHER_JSON_ERROR';}catch{lastResponse.code='UNREADABLE_JSON_ERROR';}
 }
 return response;
}
async function text(response,limit=65536){const reader=response.body.getReader(),chunks=[];let length=0;try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('Bound exceeded');}chunks.push(value);}return Buffer.concat(chunks).toString();}finally{reader.releaseLock();}}
const json=async response=>JSON.parse(await text(response));
function cookies(response){
 const result=new Map();for(const value of response.headers.getSetCookie()){
  assert.match(value,/;\s*Secure/i);assert.match(value,/;\s*HttpOnly/i);assert.match(value,/;\s*Path=\//i);assert.match(value,/;\s*SameSite=Lax/i);
  const pair=value.split(';')[0],at=pair.indexOf('=');const name=pair.slice(0,at);assert(['__Host-tam-session','__Host-tam-refresh'].includes(name));result.set(name,pair.slice(at+1));
 }assert.equal(result.size,2);return result;
}
function apply(response){for(const [k,v]of cookies(response))if(v)jar.set(k,v);else jar.delete(k);}
function privateResponse(response){assert.match(response.headers.get('cache-control')??'',/private.*no-store/);assert.notEqual(response.headers.get('cf-cache-status'),'HIT');}
try{
 const ready=await observeNativeSession(call,json,origin);readinessProbes=ready.probes;assert(ready.ready);
 step='login-with-refresh-family';const login=await call('/api/cloudflare-auth/login',{email:qa.email,password:qa.password,rememberLogin:true});assert.equal(login.status,200);const user=await json(login);assert.equal(user.user.id,qa.auth_user_id);assert.equal(user.refreshEnabled,true);apply(login);assert([...jar.values()].every(v=>/^[A-Za-z0-9_-]{43}$/.test(v)));checks.push({name:step,originalUuid:true,twoSecureHttpOnlyCookies:true});
 step='concurrent-refresh-retry';const old=cookie(),responses=await Promise.all([call('/api/cloudflare-auth/refresh',{}, {Cookie:old}),call('/api/cloudflare-auth/refresh',{}, {Cookie:old})]);
 for(const r of responses){assert.equal(r.status,200);privateResponse(r);assert.equal((await json(r)).code,'SESSION_REFRESHED');}assert.deepEqual(cookies(responses[0]),cookies(responses[1]));apply(responses[0]);checks.push({name:step,both200:true,sameCookieOutcome:true});
 step='refresh-cookie-only-page-recovery';jar.delete('__Host-tam-session');const page=await call('/learn/facebook-ads-2026/47da65a2-c6c6-4a21-a109-c1feb1d64c8f');assert.equal(page.status,200);privateResponse(page);const html=await text(page,2000000);assert(html.includes('native-d1')&&html.includes('youtube.com/embed/'));assert(!html.includes(qa.password));apply(page);checks.push({name:step,status:200,realLessonRendered:true,twoCookiesRestored:true});
 step='restored-session-identity';const session=await call('/api/cloudflare-auth/session');assert.equal(session.status,200);assert.equal((await json(session)).user.id,qa.auth_user_id);checks.push({name:step,originalUuid:true});
 step='reject-cross-origin-refresh';const rejected=await call('/api/cloudflare-auth/refresh',{}, {Origin:'https://attacker.example.invalid'});assert.equal(rejected.status,403);assert.equal(rejected.headers.get('set-cookie'),null);await rejected.body?.cancel();checks.push({name:step,status:403,noCookieMutation:true});
 step='per-device-logout';const beforeLogout=cookie(),logout=await call('/api/cloudflare-auth/logout',{all:false});assert.equal(logout.status,200);assert.equal((await json(logout)).code,'SIGNED_OUT');apply(logout);assert.equal(jar.size,0);checks.push({name:step,status:200,twoCookiesCleared:true});
 step='revoked-refresh-cannot-resurrect';const revoked=await call('/api/cloudflare-auth/refresh',{}, {Cookie:beforeLogout});assert.equal(revoked.status,401);assert.equal(revoked.headers.get('set-cookie'),null);await revoked.body?.cancel();checks.push({name:step,status:401});
 step='guest-lesson-denied';const guest=await call('/api/cloudflare-student/lesson?courseSlug=facebook-ads-2026&lessonId=47da65a2-c6c6-4a21-a109-c1feb1d64c8f');assert.equal(guest.status,401);await guest.body?.cancel();checks.push({name:step,status:401});
 const result={status:'PASS',checkedAt:new Date().toISOString(),checks,gateDelays,limits:'Hosted QA HTTP cookie jar, not a real browser or waiting for 1h expiry. Refresh-only page recovery; no global logout, context, password mutation, legacy Supabase session bridge or primary authority proof.'};writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){const failedResponse=lastResponse;if(jar.size)try{await(await call('/api/cloudflare-auth/logout',{all:false})).body?.cancel();}catch{}const result={status:'FAILED',checkedAt:new Date().toISOString(),step,completedChecks:checks.length,readinessProbes,gateDelays,failedResponse,errorCategory:['AssertionError','TimeoutError','AbortError','TypeError','SyntaxError'].includes(error?.name)?error.name:'CHECK_FAILED',limits:'Operator must close gates and revoke QA access/families; sensitive response/credentials withheld'};writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exitCode=1;}

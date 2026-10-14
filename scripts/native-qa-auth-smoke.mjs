// Dedicated QA only. No learning/customer writes, no Supabase auth mutations.
import {privateDecrypt,constants} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [keyFile,sealedFile]=process.argv.slice(2);
if(!keyFile?.startsWith('/private/tmp/theanh-native-api-qa-')||!sealedFile?.startsWith('/private/tmp/theanh-native-api-qa-'))throw Error('Temporary QA path required');
const sealed=JSON.parse(readFileSync(sealedFile,'utf8'));
const bytes=privateDecrypt({key:readFileSync(keyFile),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(sealed.sealed,'base64'));
const access=JSON.parse(bytes.toString());bytes.fill(0);
const qa=JSON.parse(readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));
const origin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
const headers={'CF-Access-Client-Id':access.client_id,'CF-Access-Client-Secret':access.client_secret};
const checks=[];let cookie,currentStep='ready';
async function call(path,body){return fetch(origin+path,{method:body===undefined?'GET':'POST',redirect:'manual',signal:AbortSignal.timeout(20000),headers:{...headers,...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)})}
async function json(r){const reader=r.body.getReader(),chunks=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();throw Error('Unexpected response')}chunks.push(value)}return JSON.parse(Buffer.concat(chunks).toString())}finally{reader.releaseLock()}}
try{
 for(let i=0;i<4;i++){const r=await call('/api/cloudflare-auth/session');if(r.status===200){assert.equal((await json(r)).user,null);break}await r.body?.cancel();if(i===3)throw Error('QA deployment not ready');await new Promise(resolve=>setTimeout(resolve,1500))}
 currentStep='password-login';const login=await call('/api/cloudflare-auth/login',{email:qa.email,password:qa.password,rememberLogin:true});const loginStatus=login.status;const data=await json(login);assert.equal(loginStatus,200);assert.equal(data.user.id,qa.auth_user_id);assert.equal(data.token,undefined);const set=login.headers.get('Set-Cookie');assert.match(set,/__Host-tam-session=/);assert.match(set,/HttpOnly/);assert.match(set,/Secure/);cookie=set.split(';')[0];checks.push({name:currentStep,status:200,originalUuid:true,secureCookie:true});
 currentStep='refresh';for(let i=0;i<2;i++){const r=await call('/api/cloudflare-auth/session');assert.equal(r.status,200);assert.equal((await json(r)).user.id,qa.auth_user_id);assert(r.headers.get('Cache-Control').includes('no-store'))}checks.push({name:currentStep,reads:2,status:200});
 currentStep='wrong-password';const wrong=await call('/api/cloudflare-auth/login',{email:qa.email,password:'Wrong-QA-password-only'});assert.equal(wrong.status,401);assert.equal(wrong.headers.get('Set-Cookie'),null);await wrong.body?.cancel();checks.push({name:currentStep,status:401});
 currentStep='progress-disabled';const disabled=await call('/api/cloudflare-student/progress',{});assert.equal(disabled.status,503);assert.equal((await json(disabled)).code,'WRITE_DISABLED');checks.push({name:currentStep,status:503});
 currentStep='logout';const out=await call('/api/cloudflare-auth/logout',{});assert.equal(out.status,200);assert.match(out.headers.get('Set-Cookie'),/Max-Age=0/);await out.body?.cancel();const after=await call('/api/cloudflare-auth/session');assert.equal((await json(after)).user,null);checks.push({name:currentStep,status:200,revokedCookieIsGuest:true});
 const report={status:'PASS',checkedAt:new Date().toISOString(),scope:'Hosted native D1 QA password/session/logout only',checks,limits:'No app UI/SSR, learning rights/content/progress, provider login, source bridge or customer migration claim'};writeFileSync('reports/cloudflare-d1/native-qa-auth-http.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch{
 // Best-effort revoke a session created before a later check failed.
 if(cookie)try{await (await call('/api/cloudflare-auth/logout',{})).body?.cancel()}catch{}
 const report={status:'FAILED',step:currentStep,completedChecks:checks.length,limits:'Sensitive response/error withheld; native QA not verified'};writeFileSync('reports/cloudflare-d1/native-qa-auth-http.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=1;
}

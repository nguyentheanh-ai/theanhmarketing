// GETs + a POST to the disabled native endpoint only. No Supabase/user writes.
// Access credential reaches this process encrypted; plaintext stays in memory.
import {privateDecrypt,constants} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [privateKeyFile,sealedFile]=process.argv.slice(2);
if(!privateKeyFile?.startsWith('/private/tmp/theanh-native-api-qa-')||!sealedFile?.startsWith('/private/tmp/theanh-native-api-qa-'))throw Error('Exact temporary QA paths required');
const envelope=JSON.parse(readFileSync(sealedFile,'utf8'));
const bytes=privateDecrypt({key:readFileSync(privateKeyFile),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(envelope.sealed,'base64'));
const credential=JSON.parse(bytes.toString());bytes.fill(0);
const origin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
const headers={'CF-Access-Client-Id':credential.client_id,'CF-Access-Client-Secret':credential.client_secret};
const checks=[];
async function request(path,extra={}){
 for(let attempt=0;attempt<3;attempt++){
  const r=await fetch(origin+path,{...extra,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{...headers,...extra.headers}});
  if(r.status!==302||attempt===2)return r;
  await r.body?.cancel();await new Promise(resolve=>setTimeout(resolve,1500));
 }
}
async function boundedJson(response){const reader=response.body.getReader();let size=0;const chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();throw Error('Unexpected native response')}chunks.push(value)}return JSON.parse(Buffer.concat(chunks).toString())}finally{reader.releaseLock()}}
try{
 for(const path of ['/api/cloudflare-auth/session','/api/cloudflare-student/access','/api/cloudflare-student/progress']){
  const extra=path.endsWith('/progress')?{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}:{};
  const r=await request(path,extra);assert.equal(r.status,503);assert.equal((await boundedJson(r)).code,'NATIVE_D1_DISABLED');assert(r.headers.get('Cache-Control').includes('no-store'));assert.equal(r.headers.get('Set-Cookie'),null);checks.push({path,status:503,disabled:true});
 }
 const home=await request('/');assert.equal(home.status,200);await home.body?.cancel();checks.push({path:'/',status:200});
 const path='/learn/facebook-ads-2026/47da65a2-c6c6-4a21-a109-c1feb1d64c8f',learn=await request(path);assert.equal(learn.status,307);const next=new URL(learn.headers.get('Location'),origin);assert.equal(next.pathname,'/dang-nhap');assert.equal(next.searchParams.get('next'),path);await learn.body?.cancel();checks.push({path,status:307,originalLessonUrlPreserved:true});
 const report={status:'PASS',checkedAt:new Date().toISOString(),scope:'Hosted A staging native-disabled + anonymous old routes behind temporary Access token',checks,limits:'No native QA login, customer import, progress write, browser/Safari or production readiness claim'};
 writeFileSync('reports/cloudflare-d1/native-disabled-http.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch{console.log(JSON.stringify({status:'FAILED',completedChecks:checks.length,limits:'Raw responses and credential errors withheld'}));process.exitCode=1}

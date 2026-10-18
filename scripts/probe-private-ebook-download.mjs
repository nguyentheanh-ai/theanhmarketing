// Existing QA only. No signed URL or credentials persisted/printed.
import fs from 'node:fs';import {parseEnv} from 'node:util';import {createServerClient} from '@supabase/ssr';import {createHash} from 'node:crypto';
if(process.argv.slice(2).join(' ')!=='--probe'){console.log('PLAN_ONLY: QA entitlement-gated PDF signed link, Range bytes and expiry signature boundaries; Source Storage stays unchanged');process.exit(0);}
const qa=JSON.parse(fs.readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));if(!qa.email?.includes('+cloudflare-qa-'))throw Error('QA_SCOPE_REQUIRED');const env=parseEnv(fs.readFileSync('.env.cfproduction','utf8'));if(!env.NEXT_PUBLIC_SUPABASE_URL?.includes('vsxxgdzwtscuxcmjfckt'))throw Error('SOURCE_A_REQUIRED');
const jar=new Map();const auth=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:list=>list.forEach(({name,value})=>jar.set(name,value))}});
const login=await auth.auth.signInWithPassword({email:qa.email,password:qa.password});if(login.error||login.data.user?.id!==qa.auth_user_id)throw Error('QA_AUTH_FAILED');
const checks=[];const hashes=[];
try{
 const cookie=[...jar].map(([k,v])=>k+'='+encodeURIComponent(v)).join('; ');
 for(const origin of ['https://www.theanhmarketing.com','https://theanh-main-cf-production.12c1thdtheanh.workers.dev']){
  const r=await fetch(origin+'/api/ebook/facebook-ads/pdf?accepted=1&format=json',{headers:{cookie},redirect:'manual',signal:AbortSignal.timeout(25000)});const data=await r.json().catch(()=>null);
  let signed;try{signed=new URL(data?.url);}catch{}const source=signed?.origin==='https://vsxxgdzwtscuxcmjfckt.supabase.co'&&signed.pathname.startsWith('/storage/v1/object/sign/facebook-ads-ebook-downloads-2026/');
  checks.push({check:'QA-private-PDF-link',origin,status:r.status,sourceStorage:source,cacheControl:r.headers.get('cache-control'),passed:r.status===200&&source===true});if(!source)continue;
  for(const range of ['bytes=0-63','bytes=-64']){
   const asset=await fetch(signed,{headers:{range},redirect:'manual',signal:AbortSignal.timeout(25000)});
   if(asset.status!==206){await asset.body?.cancel();checks.push({check:'private-PDF-Range',origin,range,status:asset.status,passed:false});continue;}
   const bytes=Buffer.from(await asset.arrayBuffer());const hash=createHash('sha256').update(bytes).digest('hex');hashes.push({origin,range,hash});checks.push({check:'private-PDF-Range',origin,range,status:asset.status,bytes:bytes.length,contentRange:asset.headers.get('content-range'),pdfHeader:range==='bytes=0-63'?bytes.subarray(0,5).toString()==='%PDF-':undefined,passed:bytes.length===64&&(range!=='bytes=0-63'||bytes.subarray(0,5).toString()==='%PDF-')});
  }
  const tampered=new URL(signed);const token=tampered.searchParams.get('token');if(token){tampered.searchParams.set('token',token+'.invalid');const denied=await fetch(tampered,{headers:{range:'bytes=0-63'},redirect:'manual',signal:AbortSignal.timeout(20000)});await denied.body?.cancel();checks.push({check:'tampered-private-signature-denied',origin,status:denied.status,passed:[400,401,403].includes(denied.status)});}
  const page=await fetch(origin+'/api/ebook/facebook-ads/page?part=1&page=1',{headers:{cookie},redirect:'manual',signal:AbortSignal.timeout(25000)});const contentType=page.headers.get('content-type');const pageBytes=Buffer.from(await page.arrayBuffer());const png=pageBytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));checks.push({check:'QA-private-Ebook-page',origin,status:page.status,contentType,bytes:pageBytes.length,png,hash:png?createHash('sha256').update(pageBytes).digest('hex'):null,passed:page.status===200&&png});
 }
 for(const range of ['bytes=0-63','bytes=-64']){const pair=hashes.filter(h=>h.range===range);checks.push({check:'Blue-Green-private-bytes-equal',range,passed:pair.length===2&&pair[0].hash===pair[1].hash});}
 const receipt={checkedAt:new Date().toISOString(),status:checks.length>8&&checks.every(c=>c.passed)?'PASS':'FAIL',checks,scope:'QA active Ebook entitlement; actual Source Storage remains source; file access/Range/signed denial proven, not R2 cutover or full PDF checksum'};fs.writeFileSync('reports/cloudflare-handoff-20261018/private-ebook-hosted-qa.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));if(receipt.status!=='PASS')process.exitCode=1;
}finally{await auth.auth.signOut({scope:'local'});}

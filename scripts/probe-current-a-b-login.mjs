// Actual hosted A->B Service Binding check. QA credentials/links never printed.
import fs from 'node:fs';import {parseEnv} from 'node:util';import {createServerClient} from '@supabase/ssr';
if(process.argv.slice(2).join(' ')!=='--probe'){console.log('PLAN_ONLY: QA sign-in A; actual bridge through STUDENT_APP; QA callback retarget only to allowlisted B preview');process.exit(0);}
const qa=JSON.parse(fs.readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));if(!qa.email?.includes('+cloudflare-qa-'))throw Error('QA_SCOPE_REQUIRED');
const env=parseEnv(fs.readFileSync('.env.cfproduction','utf8'));if(!env.NEXT_PUBLIC_SUPABASE_URL?.includes('vsxxgdzwtscuxcmjfckt'))throw Error('SOURCE_A_REQUIRED');
const jar=new Map();const auth=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:list=>list.forEach(({name,value})=>jar.set(name,value))}});
const login=await auth.auth.signInWithPassword({email:qa.email,password:qa.password});if(login.error||login.data.user?.id!==qa.auth_user_id)throw Error('QA_AUTH_FAILED');
try{
 const privacy=[];
 for(const [path,authenticated] of [['/learn/facebook-ads-2026/47da65a2-c6c6-4a21-a109-c1feb1d64c8f',true],['/api/ebook/facebook-ads/pdf?accepted=1&format=json',true],['/api/ebook/facebook-ads/pdf?accepted=1&format=json',false]]){
  const check=await fetch('https://theanh-main-cf-production.12c1thdtheanh.workers.dev'+path,{headers:authenticated?{cookie:[...jar].map(([k,v])=>k+'='+encodeURIComponent(v)).join('; ')}:{},redirect:'manual'});await check.body?.cancel();privacy.push({path,authenticated,status:check.status,cacheControl:check.headers.get('cache-control'),cdnCacheControl:check.headers.get('cdn-cache-control'),vary:check.headers.get('vary')});
 }
 fs.writeFileSync('reports/cloudflare-handoff-20261018/a-private-response-headers.json',JSON.stringify({checkedAt:new Date().toISOString(),checks:privacy},null,2)+'\n');
 const response=await fetch('https://theanh-main-cf-production.12c1thdtheanh.workers.dev/app-login-bridge',{headers:{cookie:[...jar].map(([k,v])=>k+'='+encodeURIComponent(v)).join('; ')},redirect:'manual'});await response.body?.cancel();
 const link=new URL(response.headers.get('location')??'https://invalid.invalid');const callback=new URL(link.searchParams.get('redirect_to')??'https://invalid.invalid');
 const passed=response.status===307&&link.origin==='https://pppiqhkectojxbmhqcnx.supabase.co'&&link.pathname==='/auth/v1/verify'&&callback.origin==='https://app.theanhmarketing.com';
 if(passed){link.searchParams.set('redirect_to','https://theanh-student-cf-production.12c1thdtheanh.workers.dev/auth/callback?source=website');fs.writeFileSync('/private/tmp/theanh-current-ab-final-qa-20261018.json',JSON.stringify({loginUrl:link.toString()}),{mode:0o600});}
 const receipt={checkedAt:new Date().toISOString(),status:passed?'PASS':'FAIL',httpStatus:response.status,providerOrigin:link.origin,callbackOrigin:callback.origin,scope:'Actual A Workers bridge via STUDENT_APP into B742a15d Source Auth; QA callback retargeted only for preview, not main-domain cutover'};fs.writeFileSync('reports/cloudflare-handoff-20261018/current-a-b-compatibility-binding.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));if(!passed)process.exitCode=1;
}finally{await auth.auth.signOut({scope:'local'});}

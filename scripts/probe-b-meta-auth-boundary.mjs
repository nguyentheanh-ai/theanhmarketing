// Explicit QA-only probe. No real student, Meta mutation, email or secret output.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {parseEnv} from 'node:util';
import {createClient} from '@supabase/supabase-js';import {build} from 'esbuild';
if(process.argv.slice(2).join(' ')!=='--probe'){
 console.log(JSON.stringify({status:'PLAN_ONLY',scope:'Existing QA auth; actual B client against authenticated Blue API Meta disconnect and unauthenticated401'}));process.exit(0);
}
const bRoot='/Users/theanh/CodexProjects/TheAnh-Web/worktrees/b-cf-production-20261017';
const qa=JSON.parse(fs.readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));
if(!qa.email?.includes('+cloudflare-qa-'))throw Error('QA_SCOPE_REQUIRED');
const keys=parseEnv(execFileSync('/usr/bin/textutil',['-convert','txt','-stdout',process.env.HOME+'/Documents/key.rtf'],{encoding:'utf8'}));
const key=keys.SUPABASE_SERVICE_ROLE_KEY?.trim();const claims=JSON.parse(Buffer.from(key?.split('.')[1]??'','base64url').toString());
if(claims.ref!=='pppiqhkectojxbmhqcnx'||claims.role!=='service_role')throw Error('WRONG_PROJECT');
const admin=createClient('https://pppiqhkectojxbmhqcnx.supabase.co',key,{auth:{persistSession:false,autoRefreshToken:false}});
const profile=await admin.from('profiles').select('id,status,role').eq('email',qa.email).single();
if(profile.error||profile.data?.status!=='active'||profile.data.role!=='student')throw Error('QA_PROFILE_NOT_ACTIVE');
const link=await admin.auth.admin.generateLink({type:'magiclink',email:qa.email});if(link.error)throw Error('QA_LINK_FAILED');
const auth=await admin.auth.verifyOtp({type:'magiclink',token_hash:link.data.properties.hashed_token});
if(auth.error||auth.data.user?.id!==profile.data.id)throw Error('QA_AUTH_FAILED');
const actualFetch=globalThis.fetch,checks=[];
try{
 const bundled=await build({stdin:{contents:`export * from '${bRoot}/src/lib/ads-os/client';export * from '${bRoot}/src/lib/source-session-recovery';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
 const app=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const origin='https://app.theanhmarketing.com';
 const mint=await actualFetch(origin+'/api/auth/session-cookie',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accessToken:auth.data.session.access_token})});
 const cookie=mint.headers.getSetCookie().find(v=>v.startsWith('tam_student_portal_session='))?.split(';')[0];await mint.body?.cancel();if(!cookie)throw Error('QA_COOKIE_FAILED');
 for(const authenticated of [true,false]){
  let httpStatus,contentType;globalThis.fetch=async(input,init)=>{
   if(input!=='/api/ads/meta/accounts')throw Error('PROBE_URL_BLOCKED');
   const r=await actualFetch(origin+input,{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),...(authenticated?{cookie}:{})}});httpStatus=r.status;contentType=r.headers.get("content-type");return r;
  };
  app.configureAdsScope(authenticated?'qa-provider-disconnected':'qa-no-app-cookie');let failure;
  try{await app.adsRead('/api/ads/meta/accounts');}catch(e){failure=e;}
  const recovery=app.sourceRecoveryAfterApiFailure(failure,'/app/overview');
  checks.push({authenticated,httpStatus,contentType,failureCode:failure?.message,requestsLoginRecovery:Boolean(recovery),passed:authenticated?(httpStatus===409||(httpStatus===200&&contentType?.includes('ndjson')))&&failure?.message==='disconnected'&&recovery===null:httpStatus===401&&Boolean(recovery)});
 }
 const result={checkedAt:new Date().toISOString(),status:checks.every(x=>x.passed)?'PASS':'FAIL',checks,bSource:execFileSync('git',['rev-parse','HEAD'],{cwd:bRoot,encoding:'utf8'}).trim(),scope:'Actual candidate adsRead and recovery classifier against actual Blue API; QA only, no mock provider/app API, not a browser navigation or production cutover'};
 fs.writeFileSync('reports/cloudflare-handoff-20261018/b-meta-auth-client-live-api.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
}finally{globalThis.fetch=actualFetch;await admin.auth.signOut({scope:'local'});}

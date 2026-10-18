// QA-only identity/session checks against the exact approved temporary Blue host.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {parseEnv} from 'node:util';
import {createClient} from '@supabase/supabase-js';import {build} from 'esbuild';
if(process.argv.slice(2).join(' ')!=='--probe'){console.log('PLAN_ONLY: QA Source JWT, existing verified Blue session issuer and signed-cookie readback');process.exit(0);}
const root='/Users/theanh/CodexProjects/TheAnh-Web/worktrees/b-cf-production-20261017';
const qa=JSON.parse(fs.readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));if(!qa.email?.includes('+cloudflare-qa-'))throw Error('QA_SCOPE_REQUIRED');
const keys=parseEnv(execFileSync('/usr/bin/textutil',['-convert','txt','-stdout',process.env.HOME+'/Documents/key.rtf'],{encoding:'utf8'}));const key=keys.SUPABASE_SERVICE_ROLE_KEY?.trim();const claims=JSON.parse(Buffer.from(key?.split('.')[1]??'','base64url').toString());if(claims.ref!=='pppiqhkectojxbmhqcnx'||claims.role!=='service_role')throw Error('WRONG_PROJECT');
const admin=createClient('https://pppiqhkectojxbmhqcnx.supabase.co',key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:profile,error}=await admin.from('profiles').select('id,email,status,role').eq('email',qa.email).single();if(error||profile.status!=='active'||profile.role!=='student')throw Error('QA_PROFILE_REQUIRED');
const link=await admin.auth.admin.generateLink({type:'magiclink',email:qa.email});if(link.error)throw Error('LINK_FAILED');const auth=await admin.auth.verifyOtp({type:'magiclink',token_hash:link.data.properties.hashed_token});if(auth.error||auth.data.user?.id!==profile.id)throw Error('QA_AUTH_FAILED');
try{
 const bundled=await build({stdin:{contents:`export * from '${root}/src/lib/legacy-auth-bridge';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});const app=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const session={userId:profile.id,email:profile.email,role:profile.role,expiresAt:new Date(Date.now()+86400_000).toISOString()};
 const cookie=await app.fetchLegacySessionCookie(auth.data.session.access_token,session);
 const checks=[];for(const origin of [app.LEGACY_B_ORIGIN,'https://app.theanhmarketing.com']){
  const response=await fetch(origin+'/app/overview',{headers:{cookie:'tam_student_portal_session='+cookie},redirect:'manual'});const html=await response.text();checks.push({check:'Blue-signed-cookie-original-authority',origin,status:response.status,appShell:html.includes('AdsMind'),passed:response.status===200&&html.includes('AdsMind')});
 }
 process.env.CF_B_LEGACY_AUTH_BRIDGE='on';
 const denied=await app.relayLegacySharedRequest(new Request('https://app.theanhmarketing.com/api/auth/website-login',{method:'POST',headers:{'x-student-portal-secret':'invalid-qa-probe'},body:JSON.stringify({email:qa.email,fullName:'Cloudflare QA'})}));checks.push({check:'invalid-shared-key-stays-denied',status:denied.status,passed:denied.status===401});
 let rejected=false;try{await app.fetchLegacySessionCookie('invalid-qa-token',session);}catch{rejected=true;}checks.push({check:'invalid-source-token-not-mirrored',passed:rejected});
 const green='https://theanh-student-cf-production.12c1thdtheanh.workers.dev';
 const minted=await fetch(green+'/api/auth/session-cookie',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accessToken:auth.data.session.access_token}),redirect:'manual'});
 const signed=minted.headers.getSetCookie();const original=signed.find(v=>v.startsWith('tam_student_portal_session='))?.split(';')[0];const cf=signed.find(v=>v.startsWith('__Host-tam_student_portal_cf='))?.split(';')[0];await minted.body?.cancel();
 checks.push({check:'Green-mints-both-authenticated-generations',status:minted.status,cookieNames:signed.map(v=>v.slice(0,v.indexOf('='))),passed:minted.status===200&&Boolean(original&&cf)});
 if(original&&cf){
  for(const [label,origin,credential,status] of [['Green-both-cookies',green,original+'; '+cf,200],['Green-CF-cookie-only',green,cf,200],['Blue-rollback-original-cookie',app.LEGACY_B_ORIGIN,original,200],['Green-tampered-CF-cookie',green,cf+'x',401]]){
   const r=await fetch(origin+'/api/ads/meta/status',{headers:{cookie:credential,accept:'application/json'},redirect:'manual'});const json=await r.json().catch(()=>null);checks.push({check:label,status:r.status,businessStatus:json?.status??null,passed:r.status===status});
  }
  const out=await fetch(green+'/api/auth/logout',{method:'POST',headers:{origin:green,cookie:original+'; '+cf},redirect:'manual'});await out.body?.cancel();const cleared=out.headers.getSetCookie();checks.push({check:'Green-logout-clears-both-cookies',status:out.status,passed:out.status===200&&['tam_student_portal_session','__Host-tam_student_portal_cf'].every(n=>cleared.some(v=>v.startsWith(n+'=;')&&/Max-Age=0/.test(v)))});
 }
 const invalid=await fetch(green+'/api/auth/session-cookie',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accessToken:'invalid-qa-token'}),redirect:'manual'});await invalid.body?.cancel();checks.push({check:'Green-invalid-Source-token-denied',status:invalid.status,noCookies:invalid.headers.getSetCookie().length===0,passed:invalid.status===401&&invalid.headers.getSetCookie().length===0});
 const browserLink=await admin.auth.admin.generateLink({type:'magiclink',email:qa.email,options:{redirectTo:green+'/auth/callback?next=/app/overview'}});if(browserLink.error)throw Error('QA_BROWSER_LINK_FAILED');
 fs.writeFileSync('/private/tmp/theanh-current-ab-final-qa-20261018.json',JSON.stringify({loginUrl:browserLink.data.properties.action_link}),{mode:0o600});
 const receipt={checkedAt:new Date().toISOString(),status:checks.every(c=>c.passed)?'PASS':'FAIL',checks,scope:'Actual hosted Green mirror and Blue rollback API authentication, QA only; not full Blue Meta-disconnected browser outcome or old-key successful relay; no cutover'};fs.writeFileSync('reports/cloudflare-handoff-20261018/b-blue-compatibility-origin.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));if(receipt.status!=='PASS')process.exitCode=1;
}finally{await admin.auth.signOut({scope:'local'});}

import {attachD1RefreshFamily,refreshD1Family,revokeD1RefreshFamilyOutcome,revokeAllD1RefreshFamiliesOutcome,revokeD1RefreshFamilyByRefreshOutcome,revokeAllD1RefreshFamiliesByRefreshOutcome,RefreshFamilyRateLimited,type RefreshFamilyPolicy} from '@/lib/cloudflare/d1-refresh-family';
import {readD1SessionCookie,readBoundedAuthJson} from '@/lib/cloudflare/d1-auth-http';
import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {D1_REFRESH_COOKIE,createD1RefreshCookies,clearD1RefreshCookies} from '@/lib/cloudflare/d1-refresh-cookies';
export {D1_REFRESH_COOKIE};
type Options={db:AuthDatabase;origin:string;policy:RefreshFamilyPolicy;writeEnabled?:boolean;cookieMaxAgeSeconds:number;
 allowAttempt:(request:Request,subject:string)=>Promise<{allowed:boolean;retryAfter:number}>;
 allowVerifiedAttempt:(request:Request,subject:string)=>Promise<{allowed:boolean;retryAfter:number}>};
const privacy={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','Referrer-Policy':'no-referrer','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
function result(status:number,code:string,extra:Record<string,unknown>={}){return Response.json({ok:status===200,code,...extra},{status,headers:privacy});}
function readRefresh(request:Request){const found=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(D1_REFRESH_COOKIE+'='));return found.length===1?found[0].slice(D1_REFRESH_COOKIE.length+1):'';}
// Mounted only behind the default-off staging refresh gate. No HTTP user
// field, source-provider fallback, auth key or raw token appears in JSON/logs.
export async function handleD1RefreshHttp(request:Request,options:Options){
 const url=new URL(request.url),paths=['/api/cloudflare-auth/refresh-bootstrap','/api/cloudflare-auth/refresh','/api/cloudflare-auth/logout'];
 if(!paths.includes(url.pathname))return result(404,'NOT_FOUND');
 if(url.origin!==options.origin||!options.origin.startsWith('https://')||new URL(options.origin).origin!==options.origin)return result(403,'INVALID_ORIGIN');
 if(request.method!=='POST')return new Response(null,{status:405,headers:{...privacy,Allow:'POST'}});
 if(url.search||request.headers.get('origin')!==options.origin||request.headers.get('sec-fetch-site')==='cross-site')return result(403,'INVALID_ORIGIN');
 if(options.writeEnabled!==true)return result(503,'REFRESH_WRITES_DISABLED');
 if(!Number.isSafeInteger(options.cookieMaxAgeSeconds)||options.cookieMaxAgeSeconds<1||options.cookieMaxAgeSeconds>400*86400)return result(503,'REFRESH_UNAVAILABLE');
 let body:Record<string,unknown>;try{body=await readBoundedAuthJson(request);}catch{return result(400,'INVALID_REQUEST');}
 const bootstrap=url.pathname.endsWith('/refresh-bootstrap'),logout=url.pathname.endsWith('/logout');
 if(Object.keys(body).some(k=>!(bootstrap?k==='rememberLogin':logout?k==='all':false))||(bootstrap&&body.rememberLogin!==undefined&&typeof body.rememberLogin!=='boolean')||(logout&&body.all!==undefined&&typeof body.all!=='boolean'))return result(400,'INVALID_REQUEST');
 const access=readD1SessionCookie(request),refresh=readRefresh(request),credential=bootstrap?access:logout?(access||refresh):refresh;
 const accessCookies=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('__Host-tam-session='));
 const refreshCookies=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(D1_REFRESH_COOKIE+'='));
 if(logout&&(refreshCookies.length>1||accessCookies.length>1||(accessCookies.length===1&&!access)))return result(401,'INVALID_SESSION');
 if(!credential||credential.length!==43||(request.headers.get('cookie')??'').length>32768)return result(401,'INVALID_SESSION');
 try{
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(credential))),b=>b.toString(16).padStart(2,'0')).join('');
  const decision=await options.allowAttempt(request,'refresh:'+digest);
  if(!decision.allowed){const response=result(429,'RATE_LIMITED');response.headers.set('Retry-After',String(Math.max(1,Math.ceil(decision.retryAfter))));return response;}
  const policy={...options.policy,allowFamilyAttempt:async(identity:{projectId:string;userId:string;familyId:string})=>options.allowVerifiedAttempt(request,'refresh-user:'+identity.userId)};
  if(logout){
   // Match the inspected Source UI's default global SDK logout. An explicit
   // all:false is per-device and revokes every access lease of its own family.
   let outcome=access?(body.all===false?await revokeD1RefreshFamilyOutcome(options.db,access,policy):await revokeAllD1RefreshFamiliesOutcome(options.db,access,policy)):'invalid';
   if(outcome==='invalid'&&refresh)outcome=body.all===false?await revokeD1RefreshFamilyByRefreshOutcome(options.db,refresh,policy,access||undefined):await revokeAllD1RefreshFamiliesByRefreshOutcome(options.db,refresh,policy,access||undefined);
   if(outcome==='invalid')return result(401,'INVALID_SESSION');
   const response=result(200,'SIGNED_OUT');
   if(outcome==='revoked')for(const value of clearD1RefreshCookies())response.headers.append('Set-Cookie',value);
   return response;
  }
  const pair=bootstrap?await attachD1RefreshFamily(options.db,access,{...policy,rememberLogin:body.rememberLogin===true}):await refreshD1Family(options.db,refresh,policy);
  if(!pair)return result(401,'INVALID_SESSION');
  const response=result(200,'SESSION_REFRESHED',{expiresAt:pair.expiresAt});
  for(const value of createD1RefreshCookies(pair,options.policy.now??Date.now(),options.cookieMaxAgeSeconds))response.headers.append('Set-Cookie',value);
  return response;
 }catch(error){if(error instanceof RefreshFamilyRateLimited){const response=result(429,'RATE_LIMITED');response.headers.set('Retry-After',String(Math.max(1,Math.ceil(error.retryAfter))));return response;}return result(503,'REFRESH_UNAVAILABLE');}
}

import {attachD1RefreshFamily,refreshD1Family,revokeD1RefreshFamily,revokeAllD1RefreshFamilies,RefreshFamilyRateLimited,type RefreshFamilyPolicy} from '@/lib/cloudflare/d1-refresh-family';
import {D1_SESSION_COOKIE,readD1SessionCookie,readBoundedAuthJson} from '@/lib/cloudflare/d1-auth-http';
import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
export const D1_REFRESH_COOKIE='__Host-tam-refresh';
type Options={db:AuthDatabase;origin:string;policy:RefreshFamilyPolicy;writeEnabled?:boolean;cookieMaxAgeSeconds:number;
 allowAttempt:(request:Request,subject:string)=>Promise<{allowed:boolean;retryAfter:number}>;
 allowVerifiedAttempt:(request:Request,subject:string)=>Promise<{allowed:boolean;retryAfter:number}>};
const privacy={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','Referrer-Policy':'no-referrer','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
function result(status:number,code:string,extra:Record<string,unknown>={}){return Response.json({ok:status===200,code,...extra},{status,headers:privacy});}
function readRefresh(request:Request){const found=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(D1_REFRESH_COOKIE+'='));return found.length===1?found[0].slice(D1_REFRESH_COOKIE.length+1):'';}
function cookie(name:string,value:string,age:number|null){return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax${age===null?'':'; Max-Age='+age}`;}
// Controller candidate only; not mounted by native-stage-router. No HTTP user
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
 const access=readD1SessionCookie(request),refresh=readRefresh(request),credential=bootstrap||logout?access:refresh;
 if(!credential||credential.length!==43||(request.headers.get('cookie')??'').length>32768)return result(401,'INVALID_SESSION');
 try{
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(credential))),b=>b.toString(16).padStart(2,'0')).join('');
  const decision=await options.allowAttempt(request,'refresh:'+digest);
  if(!decision.allowed){const response=result(429,'RATE_LIMITED');response.headers.set('Retry-After',String(Math.max(1,Math.ceil(decision.retryAfter))));return response;}
  const policy={...options.policy,allowFamilyAttempt:async(identity:{projectId:string;userId:string;familyId:string})=>options.allowVerifiedAttempt(request,'refresh-user:'+identity.userId)};
  if(logout){
   // Match the inspected Source UI's default global SDK logout. An explicit
   // all:false is per-device and revokes every access lease of its own family.
   if(body.all===false)await revokeD1RefreshFamily(options.db,access,policy);else await revokeAllD1RefreshFamilies(options.db,access,policy);
   const response=result(200,'SIGNED_OUT');for(const name of [D1_SESSION_COOKIE,D1_REFRESH_COOKIE])response.headers.append('Set-Cookie',cookie(name,'',0));return response;
  }
  const pair=bootstrap?await attachD1RefreshFamily(options.db,access,{...policy,rememberLogin:body.rememberLogin===true}):await refreshD1Family(options.db,refresh,policy);
  if(!pair)return result(401,'INVALID_SESSION');
  const now=options.policy.now??Date.now(),accessAge=Math.max(1,Math.ceil((Date.parse(pair.expiresAt)-now)/1000));
  const refreshAge=pair.refreshExpiresAt===null?options.cookieMaxAgeSeconds:Math.max(1,Math.min(options.cookieMaxAgeSeconds,Math.ceil((Date.parse(pair.refreshExpiresAt)-now)/1000)));
  const response=result(200,'SESSION_REFRESHED',{expiresAt:pair.expiresAt});
  response.headers.append('Set-Cookie',cookie(D1_SESSION_COOKIE,pair.accessToken,pair.rememberLogin?Math.min(accessAge,options.cookieMaxAgeSeconds):null));
  response.headers.append('Set-Cookie',cookie(D1_REFRESH_COOKIE,pair.refreshToken,pair.rememberLogin?refreshAge:null));return response;
 }catch(error){if(error instanceof RefreshFamilyRateLimited){const response=result(429,'RATE_LIMITED');response.headers.set('Retry-After',String(Math.max(1,Math.ceil(error.retryAfter))));return response;}return result(503,'REFRESH_UNAVAILABLE');}
}

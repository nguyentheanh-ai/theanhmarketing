import {resolveNativeRefreshOptions,type NativeStageEnv} from '@/lib/cloudflare/native-stage-router';
import {isNativeRefreshRoute} from '@/lib/cloudflare/native-refresh-routes';
import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {readD1SessionCookie,D1_SESSION_COOKIE} from '@/lib/cloudflare/d1-auth-http';
import {refreshD1Family,RefreshFamilyRateLimited,type RefreshFamilyPolicy} from '@/lib/cloudflare/d1-refresh-family';
import {D1_REFRESH_COOKIE,createD1RefreshCookies} from '@/lib/cloudflare/d1-refresh-cookies';
type Decision={allowed:boolean;retryAfter:number};
type Options={db:AuthDatabase;policy:RefreshFamilyPolicy;cookieMaxAgeSeconds:number;allowAttempt:(request:Request,subject:string)=>Promise<Decision>;allowVerifiedAttempt:(request:Request,subject:string)=>Promise<Decision>};
const privacy={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
function failure(status:number,retryAfter?:number){return new Response('Hệ thống phiên tạm thời chưa xử lý được. Vui lòng thử lại.',{status,headers:{...privacy,...(retryAfter?{'Retry-After':String(Math.max(1,Math.ceil(retryAfter)))}:{})}});}
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');}
// GET/HEAD only. Caller selects native protected routes and the default-off
// staging gate. Never retry a render, replay a POST, or fall back to Source.
export async function refreshNativePageRequest(request:Request,options:Options,render:(request:Request)=>Promise<Response>):Promise<Response>{
 if(!['GET','HEAD'].includes(request.method))return render(request);
 const header=request.headers.get('cookie')??'';
 if(header.length>32768)return failure(400);
 const parts=header.split(';').map(v=>v.trim()).filter(Boolean),values=(name:string)=>parts.filter(v=>v.startsWith(name+'='));
 const accessValues=values(D1_SESSION_COOKIE),refreshValues=values(D1_REFRESH_COOKIE);
 if(accessValues.length>1||refreshValues.length>1)return failure(400);
 const access=readD1SessionCookie(request),refresh=refreshValues[0]?.slice(D1_REFRESH_COOKIE.length+1)??'';
 let next=request,cookies:string[]=[];
 try{
  if(!await getD1AuthSession(options.db,access,options.policy)&&refresh){
   const url=new URL(request.url),origin=request.headers.get('origin');
   if(origin&&origin!==url.origin)return failure(403);
   if(request.headers.get('sec-fetch-site')==='cross-site'&&request.headers.get('sec-fetch-mode')!=='navigate')return failure(403);
   if(!/^[A-Za-z0-9_-]{43}$/.test(refresh))return render(request);
   const decision=await options.allowAttempt(request,'page-refresh:'+await digest(refresh));
   if(!decision.allowed)return failure(429,decision.retryAfter);
   const pair=await refreshD1Family(options.db,refresh,{...options.policy,allowFamilyAttempt:identity=>options.allowVerifiedAttempt(request,'refresh-user:'+identity.userId)});
   if(pair){
    // A partially written cookie pair must not silently switch accounts/family.
    // The old expired access lease is an association check, never authority.
    if(accessValues.length){
     if(!access)return failure(401);
     const old=await options.db.first('SELECT user_id,family_id FROM d1_auth_sessions WHERE token_hash=?1 AND project_id=?2',[await digest(access),options.policy.projectId]);
     if(!old||old.user_id!==pair.user.id||old.family_id!==pair.familyId)return failure(401);
    }
    cookies=createD1RefreshCookies(pair,options.policy.now??Date.now(),options.cookieMaxAgeSeconds);
    const headers=new Headers(request.headers),kept=parts.filter(v=>!v.startsWith(D1_SESSION_COOKIE+'=')&&!v.startsWith(D1_REFRESH_COOKIE+'='));
    headers.set('cookie',[...kept,`${D1_SESSION_COOKIE}=${pair.accessToken}`,`${D1_REFRESH_COOKIE}=${pair.refreshToken}`].join('; '));
    next=new Request(request,{headers});
   }
  }
 }catch(error){return error instanceof RefreshFamilyRateLimited?failure(429,error.retryAfter):failure(503);}
 const response=await render(next);
 if(!cookies.length)return response;
 const headers=new Headers(response.headers);
 if(headers.getSetCookie().some(v=>v.startsWith(D1_SESSION_COOKIE+'=')||v.startsWith(D1_REFRESH_COOKIE+'=')))return failure(503);
 for(const [name,value] of Object.entries(privacy))if(name!=='Vary')headers.set(name,value);
 const vary=headers.get('Vary');if(!vary?.split(',').some(v=>v.trim().toLowerCase()==='cookie'))headers.set('Vary',vary?`${vary}, Cookie`:'Cookie');
 for(const value of cookies)headers.append('Set-Cookie',value);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

// The same gate/policy/limiter as explicit HTTP refresh; missing/invalid staging
// configuration is an outage, never a Source fallback or a forced logout.
export async function withNativePageRefresh(request:Request,env:NativeStageEnv,render:(request:Request)=>Promise<Response>){
 if(!['GET','HEAD'].includes(request.method)||!isNativeRefreshRoute(new URL(request.url).pathname))return render(request);
 let options:ReturnType<typeof resolveNativeRefreshOptions>;
 try{options=resolveNativeRefreshOptions(request,env);}catch{return failure(503);}
 return options?refreshNativePageRequest(request,options,render):render(request);
}

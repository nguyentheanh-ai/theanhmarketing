import {attachD1RefreshFamily,type RefreshFamilyPolicy} from "@/lib/cloudflare/d1-refresh-family";
import {assertRefreshCookieLifetime,createD1RefreshCookies} from "@/lib/cloudflare/d1-refresh-cookies";
import { authenticateD1Password, getD1AuthSession, revokeAllD1AuthSessions, revokeD1AuthSession, type AuthDatabase } from "@/lib/cloudflare/d1-auth-core";

export const D1_SESSION_COOKIE="__Host-tam-session";
type Options={db:AuthDatabase;projectId:string;origin:string;credentialKey:string;sessionTtlMs:number;now?:number;allowedUserIds?:readonly string[];
 refreshFamily?:{policy:RefreshFamilyPolicy;cookieMaxAgeSeconds:number};
 // Called after body validation; must use shared backend limiter. Return a
 // decision instead of throwing an error with identifying request values.
 allowAttempt:(request:Request,email:string)=>Promise<{allowed:boolean;retryAfter:number}>};
function response(status:number,body:unknown,cookie?:string,retryAfter?:number){
 const headers=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff"});
 if(cookie)headers.set("Set-Cookie",cookie);
 if(retryAfter)headers.set("Retry-After",String(retryAfter));
 return new Response(JSON.stringify(body),{status,headers});
}
export function readD1SessionCookie(request:Request){
 const matches=(request.headers.get("Cookie")??"").split(";").map(part=>part.trim()).filter(part=>part.startsWith(D1_SESSION_COOKIE+"="));
 if(matches.length!==1)return "";
 const token=matches[0].slice(D1_SESSION_COOKIE.length+1);
 return /^[A-Za-z0-9_-]{43}$/.test(token)?token:"";
}
function sessionCookie(token:string,ttl:number,remember:boolean){
 return `${D1_SESSION_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax${remember?`; Max-Age=${Math.floor(ttl/1000)}`:""}`;
}
const clearCookie=`${D1_SESSION_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
async function boundedJson(request:Request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type")??""))throw new Error("Invalid request");
 const declared=request.headers.get("Content-Length");
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>8192))throw new Error("Invalid request");
 const reader=request.body?.getReader();if(!reader)throw new Error("Invalid request");
 let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw new Error("Invalid request");}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const value:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
 if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Invalid request");
 return value as Record<string,unknown>;
}
// Transport candidate. Not wired into the main-site or B until imported Auth,
// limiter, OAuth/recovery/session bridge and route parity are verified.
export async function handleD1AuthHttp(request:Request,options:Options){
 const configured=new URL(options.origin);
 if(configured.protocol!=="https:"||configured.origin!==options.origin)throw new Error("Invalid Auth origin");
 const url=new URL(request.url);
 if(url.origin!==options.origin)return response(403,{ok:false,message:"Yêu cầu không hợp lệ."});
 if(url.pathname!=="/api/cloudflare-auth/session"&&url.pathname!=="/api/cloudflare-auth/login"&&url.pathname!=="/api/cloudflare-auth/logout")return response(404,{ok:false});
 if(url.pathname.endsWith("/session")&&request.method==="GET"){
  try{const session=await getD1AuthSession(options.db,readD1SessionCookie(request),options);return response(200,{ok:true,user:session?.user??null});}
  catch{return response(503,{ok:false,message:"Hệ thống đăng nhập tạm thời chưa xử lý được."});}
 }
 if(request.method!=="POST"||url.pathname.endsWith("/session"))return response(405,{ok:false});
 // Exact Origin also prevents login/logout CSRF. No CORS or wildcard trust.
 if(request.headers.get("Origin")!==options.origin||request.headers.get("Sec-Fetch-Site")==="cross-site")return response(403,{ok:false,message:"Yêu cầu không hợp lệ."});
 let body:Record<string,unknown>;try{body=await boundedJson(request);}catch{return response(400,{ok:false,message:"Yêu cầu không hợp lệ."});}
 try{
  if(url.pathname.endsWith("/logout")){
   if(Object.keys(body).some(k=>k!=="all")||(body.all!==undefined&&typeof body.all!=="boolean"))return response(400,{ok:false});
   const token=readD1SessionCookie(request);
   if(body.all===true)await revokeAllD1AuthSessions(options.db,token,options);else await revokeD1AuthSession(options.db,token,options);
   return response(200,{ok:true},clearCookie);
  }
  if(Object.keys(body).some(k=>!["email","password","rememberLogin"].includes(k))||typeof body.email!=="string"||typeof body.password!=="string"||(body.rememberLogin!==undefined&&typeof body.rememberLogin!=="boolean")||!body.email.trim()||body.email.length>320||!body.password||new TextEncoder().encode(body.password).length>4096)return response(400,{ok:false,message:"Yêu cầu không hợp lệ."});
  const decision=await options.allowAttempt(request,body.email.trim().toLowerCase());
  if(!decision.allowed)return response(429,{ok:false,message:"Quá nhiều yêu cầu. Vui lòng thử lại sau."},undefined,Math.max(1,Math.ceil(decision.retryAfter)));
  if(options.refreshFamily)assertRefreshCookieLifetime(options.refreshFamily.cookieMaxAgeSeconds);
  const session=await authenticateD1Password(options.db,{email:body.email,password:body.password},{...options,allowAttempt:async()=>true});
  if(!session)return response(401,{ok:false,message:"Email hoặc mật khẩu chưa đúng."});
  if(options.refreshFamily){
   const {policy,cookieMaxAgeSeconds}=options.refreshFamily;
   if(policy.projectId!==options.projectId)throw Error('Refresh project mismatch');
   const pair=await attachD1RefreshFamily(options.db,session.token,{...policy,rememberLogin:body.rememberLogin===true});
   if(!pair)throw Error('Refresh session setup failed');
   const result=response(200,{ok:true,user:pair.user,expiresAt:pair.expiresAt,refreshEnabled:true});
   for(const value of createD1RefreshCookies(pair,policy.now??Date.now(),cookieMaxAgeSeconds))result.headers.append('Set-Cookie',value);
   result.headers.set('CDN-Cache-Control','no-store');result.headers.set('Cloudflare-CDN-Cache-Control','no-store');result.headers.set('Referrer-Policy','no-referrer');
   return result;
  }
  return response(200,{ok:true,user:session.user},sessionCookie(session.token,options.sessionTtlMs,body.rememberLogin===true));
 }catch{return response(503,{ok:false,message:"Hệ thống đăng nhập tạm thời chưa xử lý được."});}
}

// Shared transport helpers; never serialize opaque tokens into response JSON.
export {boundedJson as readBoundedAuthJson,sessionCookie as createD1SessionCookie};

import {updateD1AccountProfile,normalizeNativeAccountProfile} from '@/lib/cloudflare/d1-account-profile';
import {readBoundedAuthJson,readD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
import {verifyNativeAuthContext} from '@/lib/cloudflare/native-auth-context';
import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import type {AuthAuthorityPolicy} from '@/lib/cloudflare/auth-proof-domain';
type Options=AuthAuthorityPolicy&{db:AuthDatabase;origin:string;sessionTtlMs:number;allowedUserIds:readonly string[];writeEnabled:boolean;authContextKey?:string;allowAttempt:(request:Request,subject:string)=>Promise<{allowed:boolean;retryAfter:number}>};
function reply(status:number,body:unknown,retry?:number){return Response.json(body,{status,headers:{'cache-control':'private, no-store','cdn-cache-control':'no-store','vary':'Cookie','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...(retry?{'retry-after':String(retry)}:{})}});}
export async function handleD1AccountProfileHttp(request:Request,options:Options){
 if(new URL(request.url).pathname!=='/api/cloudflare-auth/profile')return reply(404,{ok:false});
 if(request.method!=='POST')return new Response(null,{status:405,headers:{allow:'POST','cache-control':'private, no-store'}});
 if(new URL(request.url).origin!==options.origin||!options.origin.startsWith('https://')||request.headers.get('origin')!==options.origin||request.headers.get('sec-fetch-site')==='cross-site')return reply(403,{ok:false});
 if(!options.writeEnabled)return reply(503,{ok:false,code:'WRITE_DISABLED'});
 if(!options.authContextKey)return reply(503,{ok:false,code:'AUTH_CONTEXT_REQUIRED'});
 let body;try{body=normalizeNativeAccountProfile(await readBoundedAuthJson(request));}catch{return reply(400,{ok:false});}
 const token=readD1SessionCookie(request);if(!token)return reply(401,{ok:false});
 try{
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)),subject='profile:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const limit=await options.allowAttempt(request,subject);if(!limit.allowed)return reply(429,{ok:false},Math.max(1,Math.ceil(limit.retryAfter)));
  if(!await verifyNativeAuthContext(options.db,{accessToken:token},request.headers.get('X-TAM-Auth-Context')??'',{...options,key:options.authContextKey}))return reply(409,{ok:false,code:'AUTH_CONTEXT_CHANGED'});
  const result=await updateD1AccountProfile(options.db,token,body,options);
  return result?reply(200,{ok:true,profile:result}):reply(401,{ok:false});
 }catch{return reply(503,{ok:false,message:'Chưa xác nhận được thay đổi thông tin. Vui lòng tải lại và thử lại.'});}
}

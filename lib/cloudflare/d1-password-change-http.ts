import type {AuthAuthorityPolicy} from '@/lib/cloudflare/auth-proof-domain';
import {verifyNativeAuthContext} from '@/lib/cloudflare/native-auth-context';
import {clearD1RefreshCookies} from '@/lib/cloudflare/d1-refresh-cookies';
import {changeD1Password,validNativeNewPassword} from '@/lib/cloudflare/d1-password-change';
import {readD1SessionCookie,readBoundedAuthJson,createD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
type Options=AuthAuthorityPolicy&{db:AuthDatabase;origin:string;credentialKey:string;sessionTtlMs:number;allowedUserIds:readonly string[];writeEnabled:boolean;refreshFamilies?:boolean;authContextKey?:string;allowAttempt:(request:Request,subject:string)=>Promise<{allowed:boolean;retryAfter:number}>};
function reply(status:number,body:unknown,cookie?:string,retry?:number){const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});if(cookie)headers.set('Set-Cookie',cookie);if(retry)headers.set('Retry-After',String(retry));return new Response(JSON.stringify(body),{status,headers});}
export async function handleD1PasswordChangeHttp(request:Request,options:Options){
 const url=new URL(request.url);if(url.pathname!=='/api/cloudflare-auth/change-password')return reply(404,{ok:false});
 if(url.origin!==options.origin||!options.origin.startsWith('https://'))return reply(403,{ok:false});
 if(request.method!=='POST')return reply(405,{ok:false});
 if(request.headers.get('Origin')!==options.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return reply(403,{ok:false});
 if(options.writeEnabled!==true)return reply(503,{ok:false,code:'WRITE_DISABLED'});
 let body:Record<string,unknown>;try{body=await readBoundedAuthJson(request)}catch{return reply(400,{ok:false})}
 if(Object.keys(body).sort().join(',')!=='currentPassword,newPassword,operationId'||typeof body.currentPassword!=='string'||!body.currentPassword||new TextEncoder().encode(body.currentPassword).length>4096||!validNativeNewPassword(body.newPassword)||body.newPassword===body.currentPassword||typeof body.operationId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(body.operationId))return reply(400,{ok:false});
 const token=readD1SessionCookie(request);if(!token)return reply(401,{ok:false});
 try{
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));const subject='credential-change:'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  const limit=await options.allowAttempt(request,subject);if(!limit.allowed)return reply(429,{ok:false},undefined,Math.max(1,Math.ceil(limit.retryAfter)));
  if(options.authContextKey&&!await verifyNativeAuthContext(options.db,{accessToken:token},request.headers.get('X-TAM-Auth-Context')??'',{...options,key:options.authContextKey}))return reply(409,{ok:false,code:'AUTH_CONTEXT_CHANGED'});
  const result=await changeD1Password(options.db,{token,currentPassword:body.currentPassword,newPassword:body.newPassword,operationId:body.operationId},options);
  if(!result)return reply(401,{ok:false,message:'Phiên hoặc mật khẩu hiện tại chưa hợp lệ.'});
  if(options.refreshFamilies===true){
   const response=reply(200,{ok:true,reauthenticate:true});
   // A status-only retry may arrive after a newer login. Do not clear its cookies.
   if('clearCookies' in result&&result.clearCookies===true)for(const value of clearD1RefreshCookies())response.headers.append('Set-Cookie',value);
   return response;
  }
  return reply(200,{ok:true,reauthenticate:true},createD1SessionCookie('',0,true));
 }catch{return reply(503,{ok:false,message:'Chưa xác nhận được thay đổi. Vui lòng thử lại hoặc đăng nhập lại bằng mật khẩu mới.'});}
}

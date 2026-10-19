// Same-origin Supabase HTTP surface for the browser in native data mode:
// /auth/v1/* (GoTrue subset) and /rest/v1/* (PostgREST subset over the D1
// shim with RLS). The browser supabase-js client keeps working unchanged when
// NEXT_PUBLIC_SUPABASE_URL is the site origin. The opaque native session token
// is both the bearer token and the HttpOnly __Host session cookie.
import {authenticateD1Password,getD1AuthSession,revokeD1AuthSession,rotateD1AuthSession,type AuthDatabase} from './d1-auth-core';
import {createD1SessionCookie,readD1SessionCookie,D1_SESSION_COOKIE} from './d1-auth-http';
import {consumeD1AuthAttempt} from './d1-auth-rate-limit';
import {requestNativeSignup,requestNativeRecovery} from './d1-auth-signup-recovery';
import type {AuthorityHandoff} from './d1-data-authority';
import type {D1PostgrestClient,ShimAuth,ShimRow} from './d1-postgrest';

const PROJECT='vsxxgdzwtscuxcmjfckt',TTL=30*86400000;
type AdminApi={getUserById:(id:string)=>Promise<{data:{user:unknown};error:unknown}>;updateUserById:(id:string,a:Record<string,unknown>)=>Promise<{data:{user:unknown};error:{message:string;status:number}|null}>};
export type NativeSupabaseHttpOptions={
 authDb:AuthDatabase;admin:AdminApi;credentialKey:string;limiterKey:string;nativeAuthority:AuthorityHandoff;
 client:(auth:ShimAuth|null)=>D1PostgrestClient;adminEmails:readonly string[];
 sendSignupEmail?:(email:string,token:string)=>Promise<void>;sendRecoveryEmail?:(email:string,token:string)=>Promise<void>;
};
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const json=(status:number,body:unknown,extra:Record<string,string>={})=>new Response(body===null?null:JSON.stringify(body),{status,headers:{...headers,...extra}});
const authError=(status:number,code:string,msg:string)=>json(status,{code:status,error_code:code,msg,error:code,error_description:msg});
const clearCookie=`${D1_SESSION_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
function bearer(request:Request){const h=request.headers.get('authorization')??'';const m=h.match(/^Bearer\s+([A-Za-z0-9_-]{43})$/);return m?m[1]:readD1SessionCookie(request);}
async function body(request:Request){const t=await request.text();if(t.length>65536)throw new Error('too large');return t?JSON.parse(t) as Record<string,unknown>:{};}

export function createNativeSupabaseHttp(o:NativeSupabaseHttpOptions){
 const policy=(extra:Record<string,unknown>={})=>({projectId:PROJECT,sessionTtlMs:TTL,nativeAuthority:o.nativeAuthority,...extra});
 const sessionOf=async(token:string)=>token?getD1AuthSession(o.authDb,token,policy()).catch(()=>null):null;
 const userOf=async(id:string)=>(await o.admin.getUserById(id)).data.user as ShimRow|null;
 const sessionBody=async(token:string,expiresAt:string,userId:string)=>{const exp=Math.floor(Date.parse(expiresAt)/1000);return {access_token:token,token_type:'bearer',expires_in:Math.max(0,exp-Math.floor(Date.now()/1000)),expires_at:exp,refresh_token:token,user:await userOf(userId)};};
 // RLS identity for /rest/v1 (anon when no valid session).
 const shimAuth=async(request:Request):Promise<ShimAuth>=>{
  const s=await sessionOf(bearer(request));if(!s)return {role:'anon',uid:null,isAdmin:false,jwtAdminRole:null};
  const isAdmin=Boolean(s.user.adminRole)||o.adminEmails.includes(s.user.email);
  return {role:'authenticated',uid:s.user.id,isAdmin,jwtAdminRole:s.user.adminRole};
 };
 async function auth(request:Request,path:string):Promise<Response>{
  const url=new URL(request.url);
  if(path==='/token'&&request.method==='POST'){
   const grant=url.searchParams.get('grant_type'),b=await body(request);
   if(grant==='password'){
    const email=String(b.email??'').trim().toLowerCase(),ip=request.headers.get('CF-Connecting-IP')??'';
    if(!ip)return authError(400,'validation_failed','Trusted edge required');
    const session=await authenticateD1Password(o.authDb,{email,password:String(b.password??'')},{...policy(),credentialKey:o.credentialKey,
     allowAttempt:async()=>(await consumeD1AuthAttempt(o.authDb,{projectId:PROJECT,ip,email:email||'empty@native.invalid'},{secret:o.limiterKey,ip:{limit:10,windowMs:60000},email:{limit:5,windowMs:60000}})).allowed}).catch(()=>null);
    if(!session)return authError(400,'invalid_credentials','Invalid login credentials');
    return json(200,await sessionBody(session.token,session.expiresAt,session.user.id),{'Set-Cookie':createD1SessionCookie(session.token,TTL,true)});
   }
   if(grant==='refresh_token'){
    const rotated=await rotateD1AuthSession(o.authDb,String(b.refresh_token??''),policy()).catch(()=>null);
    const next=rotated?await sessionOf(rotated.token):null;
    if(!rotated||!next)return authError(400,'refresh_token_not_found','Invalid Refresh Token: Refresh Token Not Found');
    return json(200,await sessionBody(rotated.token,rotated.expiresAt,next.user.id),{'Set-Cookie':createD1SessionCookie(rotated.token,TTL,true)});
   }
   return authError(400,'unsupported_grant_type','Unsupported grant type');
  }
  if(path==='/user'&&request.method==='GET'){const s=await sessionOf(bearer(request));if(!s)return authError(401,'bad_jwt','invalid JWT');return json(200,await userOf(s.user.id));}
  if(path==='/user'&&request.method==='PUT'){
   const token=bearer(request),s=await sessionOf(token);if(!s)return authError(401,'bad_jwt','invalid JWT');const b=await body(request);
   if(typeof b.password==='string'){
    // GoTrue updateUser({password}): the session is the proof (the app re-checks
    // the current password with signInWithPassword before calling this).
    const r=await o.admin.updateUserById(s.user.id,{password:b.password});
    if(r.error)return authError(r.error.status,'weak_password',r.error.message);
   }
   if(b.data&&typeof b.data==='object'){const r=await o.admin.updateUserById(s.user.id,{user_metadata:b.data});if(r.error)return authError(r.error.status,'validation_failed',r.error.message);}
   return json(200,await userOf(s.user.id));
  }
  if(path==='/logout'&&request.method==='POST'){const token=bearer(request);if(token)await revokeD1AuthSession(o.authDb,token,policy()).catch(()=>null);return json(204,null,{'Set-Cookie':clearCookie});}
  if(path==='/signup'&&request.method==='POST'){
   const b=await body(request),data=(b.data??{}) as Record<string,unknown>;
   const r=await requestNativeSignup(o.authDb as never,{email:b.email,password:b.password,fullName:data.full_name,phone:data.phone,interestedCourse:data.interested_course},{nativeAuthority:o.nativeAuthority,credentialKey:o.credentialKey}).catch(e=>e instanceof RangeError?'invalid':null);
   if(r==='invalid')return authError(422,'validation_failed','Unable to validate email address: invalid format');
   if(!r)return authError(503,'unexpected_failure','Signup unavailable');
   const result=r as {status:string;token?:string;email:string};
   if(result.token&&o.sendSignupEmail)await o.sendSignupEmail(result.email,result.token);
   // GoTrue hides whether the email exists: always return a user-like stub.
   return json(200,{id:crypto.randomUUID(),aud:'authenticated',role:'',email:result.email,user_metadata:data,app_metadata:{provider:'email',providers:['email']},identities:[],created_at:new Date().toISOString()});
  }
  if(path==='/recover'&&request.method==='POST'){
   const b=await body(request);const r=await requestNativeRecovery(o.authDb as never,b.email,{nativeAuthority:o.nativeAuthority,credentialKey:o.credentialKey}).catch(()=>null);
   if(r&&r.status==='issued'&&o.sendRecoveryEmail)await o.sendRecoveryEmail(r.email,r.token);
   return json(200,{});
  }
  if(path==='/verify'&&request.method==='POST'){
   // Recovery link: token_hash is the native one-time token; password is set by /doi-mat-khau.
   return authError(400,'otp_expired','Use the native recovery link');
  }
  if(path==='/settings'&&request.method==='GET')return json(200,{external:{email:true},disable_signup:false,mailer_autoconfirm:false});
  return authError(404,'not_found','Not found');
 }
 // PostgREST subset: GET/HEAD select, POST insert/upsert, PATCH update, DELETE.
 async function rest(request:Request,path:string):Promise<Response>{
  const url=new URL(request.url),client=o.client(await shimAuth(request));
  const rpc=path.match(/^\/rpc\/([a-z0-9_]+)$/);
  const profile=request.headers.get(request.method==='GET'||request.method==='HEAD'?'accept-profile':'content-profile')??'public';
  const scoped=profile==='public'?client:client.schema(profile);
  if(rpc){const args=request.method==='GET'?Object.fromEntries(url.searchParams):await body(request);const r=await scoped.rpc(rpc[1],args);return r.error?json(r.status,r.error):json(200,r.data);}
  const table=path.match(/^\/([a-z0-9_]+)$/)?.[1];if(!table)return json(404,{message:'Not found',code:'PGRST125'});
  const prefer=(request.headers.get('prefer')??'').split(',').map(x=>x.trim());
  const count=prefer.find(p=>p.startsWith('count='))?.slice(6),representation=prefer.includes('return=representation');
  const single=(request.headers.get('accept')??'').includes('application/vnd.pgrst.object+json');
  const select=url.searchParams.get('select')??'*';
  let q:ReturnType<D1PostgrestClient['from']>;
  const b=request.method==='POST'||request.method==='PATCH'?await body(request) as unknown as ShimRow|ShimRow[]:null;
  if(request.method==='GET'||request.method==='HEAD')q=scoped.from(table).select(select,{count,head:request.method==='HEAD'});
  else if(request.method==='POST'){
   const resolution=prefer.find(p=>p.startsWith('resolution='));
   q=resolution?scoped.from(table).upsert(b!,{onConflict:url.searchParams.get('on_conflict')??undefined,ignoreDuplicates:resolution==='resolution=ignore-duplicates'}):scoped.from(table).insert(b!);
   if(representation)q=q.select(select);
  }else if(request.method==='PATCH'){q=scoped.from(table).update(b as ShimRow);if(representation)q=q.select(select);}
  else if(request.method==='DELETE'){q=scoped.from(table).delete();if(representation)q=q.select(select);}
  else return json(405,{message:'Method not allowed'});
  for(const [key,raw] of url.searchParams){
   if(['select','order','limit','offset','on_conflict','columns'].includes(key))continue;
   if(key==='or'||key==='and'){q=q.or(raw.replace(/^\(|\)$/g,''));continue;}
   const m=raw.match(/^(not\.)?(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|ov)\.([\s\S]*)$/);if(!m)return json(400,{message:`failed to parse filter (${raw.slice(0,40)})`,code:'PGRST100'});
   let value:unknown=m[3];if(m[2]==='in')value=m[3].replace(/^\(|\)$/g,'').split(',').map(x=>x.replace(/^"(.*)"$/,'$1'));
   if(m[2]==='like'||m[2]==='ilike')value=String(value).replace(/\*/g,'%');
   q=m[1]?q.not(key,m[2],value):q.filter(key,m[2],value);
  }
  const order=url.searchParams.get('order');
  if(order)for(const part of order.split(',')){const [col,...mods]=part.split('.');q=q.order(col,{ascending:!mods.includes('desc'),nullsFirst:mods.includes('nullsfirst')?true:mods.includes('nullslast')?false:undefined});}
  const limit=url.searchParams.get('limit'),offset=url.searchParams.get('offset');
  if(limit!==null)q=offset!==null?q.range(Number(offset),Number(offset)+Number(limit)-1):q.limit(Number(limit));
  if(single)q=q.single();
  const r=await q;
  if(r.error)return json(r.status,r.error);
  const extra:Record<string,string>=r.count!==null?{'Content-Range':`*/${r.count}`}:{};
  if(r.data===null&&!single)return json(request.method==='GET'||request.method==='HEAD'?200:r.status,null,extra);
  return json(r.status,r.data,extra);
 }
 return {
  async handle(request:Request):Promise<Response|null>{
   const url=new URL(request.url);
   try{
    if(url.pathname.startsWith('/auth/v1/'))return await auth(request,url.pathname.slice(8));
    if(url.pathname.startsWith('/rest/v1/'))return await rest(request,url.pathname.slice(8));
   }catch{return json(400,{message:'Bad request',code:'PGRST100'});}
   return null;
  },
  shimAuth,
 };
}

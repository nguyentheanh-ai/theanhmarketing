import type {SupabaseClient} from '@supabase/supabase-js';
import {getNativeRequestContext} from './native-request-context';
import {registerNativeDataFactory} from './native-data-mode';
import {createD1PostgrestClient,type ShimAuth,type ShimDatabase,type ShimRls,type ShimSchema} from './d1-postgrest';
import {supabaseARpcs} from './d1-rpc-a';
import schemaA from './generated/supabase-schema-a.json';
import rlsA from './generated/supabase-rls-a.json';
import {createNativeAuthAdmin} from './native-auth-admin';
import {createD1AuthDatabase,type AuthD1Binding} from './d1-auth-database';
import type {AuthorityHandoff} from './d1-data-authority';
import {createNativeStorage,type NativeR2Bucket} from './native-storage';
import {getD1AuthSession} from './d1-auth-core';
import {readD1SessionCookie} from './d1-auth-http';
import {createNativeSupabaseHttp} from './native-supabase-http';
import {sendNativeAuthEmail} from './native-email-auth-http';
import {createResendSender} from './native-paid-email';
import {getConfiguredOwnerEmails} from '@/lib/admin/admin-emails';
import {openLegacyBcryptHash,verifyLegacyBcryptPassword} from './legacy-password';

type D1Binding={withSession:(c:string)=>{prepare:(sql:string)=>{bind:(...v:unknown[])=>{all:()=>Promise<{results:Record<string,unknown>[]}>}};batch:(s:unknown[])=>Promise<{results:Record<string,unknown>[]}[]>}};
export type NativeDataEnv={CF_NATIVE_DATA_MODE?:string;NATIVE_DATA_DB?:D1Binding;NATIVE_AUTH_DB?:D1Binding;NATIVE_AUTH_CREDENTIAL_KEY?:string;NATIVE_AUTH_AUTHORITY?:string;NATIVE_DATA_AUTHORITY?:string;NATIVE_AUTH_LIMITER_KEY?:string;NATIVE_RESEND_API_KEY?:string;PRIVATE_ASSETS?:NativeR2Bucket;R2_PRIVATE_URL_SECRET?:string};

export function createShimDatabase(binding:D1Binding):ShimDatabase{
 // Primary-pinned session: reads see this request's own writes.
 const session=binding.withSession('first-primary');
 return {
  all:async(sql,params)=>(await session.prepare(sql).bind(...params).all()).results,
  batch:async statements=>(await session.batch(statements.map(s=>session.prepare(s.sql).bind(...s.params)))).map(r=>r.results),
 };
}
// Supabase admin/auth/storage sub-APIs not yet ported fail loudly instead of
// silently falling back to Supabase.
function unported(area:string){return new Proxy({},{get:(_t,key)=>key==='then'?undefined:()=>{throw new Error(`Native D1 mode: ${area}.${String(key)} is not available`);}});}

const authDbOf=(env:NativeDataEnv)=>env.NATIVE_DATA_DB??env.NATIVE_AUTH_DB;
const authorityOf=(env:NativeDataEnv):AuthorityHandoff|null=>{try{const raw=env.NATIVE_DATA_AUTHORITY??env.NATIVE_AUTH_AUTHORITY;return raw?JSON.parse(raw) as AuthorityHandoff:null;}catch{return null;}};
function nativeAuth(env:NativeDataEnv){
 const binding=authDbOf(env);
 if(!binding||!/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_CREDENTIAL_KEY??''))return unported('auth');
 const db=createShimDatabase(binding),authority=authorityOf(env);
 const admin=createNativeAuthAdmin({first:async(q,p)=>(await db.all(q,p))[0]??null,all:(q,p)=>db.all(q,p),run:async(q,p)=>{await db.all(q,p);}},
  {credentialKey:env.NATIVE_AUTH_CREDENTIAL_KEY!,projectId:'vsxxgdzwtscuxcmjfckt',nativeAuthority:authority,recoveryDb:createD1AuthDatabase(binding as unknown as AuthD1Binding)});
 // Session methods (signIn/getUser) belong to the native auth routes, not the admin client.
 return new Proxy({admin},{get:(t,key)=>key==='admin'?t.admin:key==='then'?undefined:()=>{throw new Error(`Native D1 mode: auth.${String(key)} is not available on the service client`);}});
}
export function nativeStorage(env:NativeDataEnv|undefined=getNativeRequestContext()?.env as NativeDataEnv|undefined){
 const request=getNativeRequestContext()?.request;
 if(!env?.NATIVE_DATA_DB||!env.PRIVATE_ASSETS||!env.R2_PRIVATE_URL_SECRET||!request)return null;
 return createNativeStorage({db:createShimDatabase(env.NATIVE_DATA_DB),r2:env.PRIVATE_ASSETS,origin:new URL(request.url).origin,secret:env.R2_PRIVATE_URL_SECRET});
}
// Returns a supabase-js compatible client on D1 when CF_NATIVE_DATA_MODE=d1
// for this request; otherwise null so callers keep the real Supabase client.
export function createNativeDataClient(auth:ShimAuth|null=null):SupabaseClient|null{
 const env=getNativeRequestContext()?.env as NativeDataEnv|undefined;
 if(env?.CF_NATIVE_DATA_MODE!=='d1')return null;
 if(!env.NATIVE_DATA_DB)throw new Error('Native D1 mode: NATIVE_DATA_DB binding missing');
 const client=createD1PostgrestClient(createShimDatabase(env.NATIVE_DATA_DB),schemaA as unknown as ShimSchema,{prefix:'a',rpc:supabaseARpcs,auth,rls:rlsA as unknown as ShimRls});
 return Object.assign(client,{auth:nativeAuth(env),storage:nativeStorage(env)??unported('storage')}) as unknown as SupabaseClient;
}

// Signed-in user for server components/routes in native data mode, from the
// native session cookie, shaped like the Supabase User the app already reads.
export async function nativeCurrentUser(){
 const context=getNativeRequestContext(),env=context?.env as NativeDataEnv|undefined;
 const binding=env?authDbOf(env):undefined;if(!context||!env||!binding)return null;
 const token=readD1SessionCookie(context.request);if(!token)return null;
 const authority=authorityOf(env);if(!authority)return null;
 const session=await getD1AuthSession(createD1AuthDatabase(binding as unknown as AuthD1Binding),token,{projectId:'vsxxgdzwtscuxcmjfckt',sessionTtlMs:30*86400000,nativeAuthority:authority}).catch(()=>null);
 if(!session)return null;
 const auth=nativeAuth(env) as unknown as {admin?:{getUserById:(id:string)=>Promise<{data:{user:unknown}}>}};
 const full=await auth.admin?.getUserById(session.user.id).catch(()=>null);
 return (full?.data?.user??null) as import('@supabase/supabase-js').User|null;
}

// Same-origin /auth/v1 + /rest/v1 for the browser supabase-js client.
export function nativeSupabaseHttp(env:NativeDataEnv,origin:string){
 const authority=authorityOf(env),authBinding=authDbOf(env);
 if(!env.NATIVE_DATA_DB||!authBinding||!authority||!/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_CREDENTIAL_KEY??'')||!/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_LIMITER_KEY??''))return null;
 const auth=nativeAuth(env) as unknown as {admin:Parameters<typeof createNativeSupabaseHttp>[0]['admin']};
 // Production reuses its existing RESEND_API_KEY secret.
 const resendKey=env.NATIVE_RESEND_API_KEY??(env as {RESEND_API_KEY?:string}).RESEND_API_KEY,send=resendKey?createResendSender(resendKey):null;
 const data=env.NATIVE_DATA_DB;
 return createNativeSupabaseHttp({authDb:createD1AuthDatabase(authBinding as unknown as AuthD1Binding),admin:auth.admin,credentialKey:env.NATIVE_AUTH_CREDENTIAL_KEY!,limiterKey:env.NATIVE_AUTH_LIMITER_KEY!,nativeAuthority:authority,
  adminEmails:getConfiguredOwnerEmails(),
  client:a=>createD1PostgrestClient(createShimDatabase(data),schemaA as unknown as ShimSchema,{prefix:'a',rpc:supabaseARpcs,auth:a,rls:rlsA as unknown as ShimRls}),
  sendSignupEmail:send?async(e,t)=>{await sendNativeAuthEmail('signup',e,t,origin,send);}:undefined,
  sendRecoveryEmail:send?async(e,t)=>{await sendNativeAuthEmail('recovery',e,t,origin,send);}:undefined});
}

// Called once by the Worker entry.
export async function nativeVerifyStudentPassword(email:string,password:string){
 const env=getNativeRequestContext()?.env as NativeDataEnv|undefined,binding=env?authDbOf(env):undefined;
 if(!env||!binding||!/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_CREDENTIAL_KEY??''))return false;
 const row=(await createShimDatabase(binding).all(`SELECT u.id,a.credential_ciphertext FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id WHERE u.normalized_email=?1 AND a.deleted_at IS NULL`,[email.trim().toLowerCase()]))[0];
 if(!row||typeof row.credential_ciphertext!=='string')return false;
 try{return await verifyLegacyBcryptPassword(password,await openLegacyBcryptHash(row.credential_ciphertext,env.NATIVE_AUTH_CREDENTIAL_KEY!,{projectId:'vsxxgdzwtscuxcmjfckt',userId:String(row.id)}));}catch{return false;}
}
export function installNativeDataFactory(){registerNativeDataFactory({client:createNativeDataClient,currentUser:nativeCurrentUser,verifyPassword:nativeVerifyStudentPassword});}

// pg_cron parity (Supabase A job "checkout-abuse-redact-expired-ips", 17 18 * * *):
// drop IP/user agent of expired checkout-abuse events. Native data mode only.
export async function runNativeMaintenanceCron(env:NativeDataEnv,scheduledTime:number){
 if(env.CF_NATIVE_DATA_MODE!=='d1'||!env.NATIVE_DATA_DB)return {status:'disabled' as const};
 const at=new Date(Math.floor(scheduledTime/60000)*60000);
 if(!(at.getUTCHours()===18&&at.getUTCMinutes()>=15&&at.getUTCMinutes()<20))return {status:'not_due' as const};
 const stamp=at.toISOString().replace('Z','+00:00').replace(/\.000\+/,'+');
 const rows=await createShimDatabase(env.NATIVE_DATA_DB).all(`UPDATE "a_public__checkout_abuse_events" SET ip_address=NULL,user_agent=NULL,updated_at=?1 WHERE expires_at<=?1 AND (ip_address IS NOT NULL OR user_agent IS NOT NULL) RETURNING id`,[stamp]);
 return {status:'ran' as const,redacted:rows.length};
}

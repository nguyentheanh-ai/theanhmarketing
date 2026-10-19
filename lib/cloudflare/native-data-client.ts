import type {SupabaseClient} from '@supabase/supabase-js';
import {getNativeRequestContext} from './native-request-context';
import {createD1PostgrestClient,type ShimAuth,type ShimDatabase,type ShimRls,type ShimSchema} from './d1-postgrest';
import {supabaseARpcs} from './d1-rpc-a';
import schemaA from './generated/supabase-schema-a.json';
import rlsA from './generated/supabase-rls-a.json';
import {createNativeAuthAdmin} from './native-auth-admin';
import {createD1AuthDatabase,type AuthD1Binding} from './d1-auth-database';
import type {AuthorityHandoff} from './d1-data-authority';

type D1Binding={withSession:(c:string)=>{prepare:(sql:string)=>{bind:(...v:unknown[])=>{all:()=>Promise<{results:Record<string,unknown>[]}>}};batch:(s:unknown[])=>Promise<{results:Record<string,unknown>[]}[]>}};
export type NativeDataEnv={CF_NATIVE_DATA_MODE?:string;NATIVE_DATA_DB?:D1Binding;NATIVE_AUTH_DB?:D1Binding;NATIVE_AUTH_CREDENTIAL_KEY?:string;NATIVE_AUTH_AUTHORITY?:string};

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

function nativeAuth(env:NativeDataEnv){
 if(!env.NATIVE_AUTH_DB||!/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_CREDENTIAL_KEY??''))return unported('auth');
 const db=createShimDatabase(env.NATIVE_AUTH_DB);
 let authority:AuthorityHandoff|null=null;try{authority=env.NATIVE_AUTH_AUTHORITY?JSON.parse(env.NATIVE_AUTH_AUTHORITY) as AuthorityHandoff:null;}catch{authority=null;}
 const admin=createNativeAuthAdmin({first:async(q,p)=>(await db.all(q,p))[0]??null,all:(q,p)=>db.all(q,p),run:async(q,p)=>{await db.all(q,p);}},
  {credentialKey:env.NATIVE_AUTH_CREDENTIAL_KEY!,projectId:'vsxxgdzwtscuxcmjfckt',nativeAuthority:authority,recoveryDb:createD1AuthDatabase(env.NATIVE_AUTH_DB as unknown as AuthD1Binding)});
 // Session methods (signIn/getUser) belong to the native auth routes, not the admin client.
 return new Proxy({admin},{get:(t,key)=>key==='admin'?t.admin:key==='then'?undefined:()=>{throw new Error(`Native D1 mode: auth.${String(key)} is not available on the service client`);}});
}
// Returns a supabase-js compatible client on D1 when CF_NATIVE_DATA_MODE=d1
// for this request; otherwise null so callers keep the real Supabase client.
export function nativeDataClient(auth:ShimAuth|null=null):SupabaseClient|null{
 const env=getNativeRequestContext()?.env as NativeDataEnv|undefined;
 if(env?.CF_NATIVE_DATA_MODE!=='d1')return null;
 if(!env.NATIVE_DATA_DB)throw new Error('Native D1 mode: NATIVE_DATA_DB binding missing');
 const client=createD1PostgrestClient(createShimDatabase(env.NATIVE_DATA_DB),schemaA as unknown as ShimSchema,{prefix:'a',rpc:supabaseARpcs,auth,rls:rlsA as unknown as ShimRls});
 return Object.assign(client,{auth:nativeAuth(env),storage:unported('storage')}) as unknown as SupabaseClient;
}
export const nativeDataModeEnabled=()=>(getNativeRequestContext()?.env as NativeDataEnv|undefined)?.CF_NATIVE_DATA_MODE==='d1';

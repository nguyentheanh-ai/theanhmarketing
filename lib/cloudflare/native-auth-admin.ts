// supabase.auth.admin compatible API over the native D1 Auth tables
// (d1_access_users + d1_auth_accounts). Passwords are bcrypt hashed like
// Supabase GoTrue and sealed with the native credential key (user-bound).
import bcrypt from 'bcryptjs';
import {sealLegacyBcryptHash} from './legacy-password';
import {validNativeNewPassword} from './d1-password-change';
import {requestNativeRecovery} from './d1-auth-signup-recovery';
import type {AuthorityHandoff} from './d1-data-authority';

type Row=Record<string,unknown>;
export type AuthAdminDb={first:(sql:string,p:unknown[])=>Promise<Row|null>;all:(sql:string,p:unknown[])=>Promise<Row[]>;run:(sql:string,p:unknown[])=>Promise<void>};
type Options={credentialKey:string;projectId:string;nativeAuthority?:AuthorityHandoff|null;now?:()=>number;recoveryDb?:unknown};
type AuthError={message:string;status:number;code:string;name:'AuthApiError'};
const fail=(message:string,status=400,code='unexpected_failure'):{data:Record<string,unknown>;error:AuthError}=>({data:{user:null},error:{message,status,code,name:'AuthApiError'}});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECT=`SELECT u.id,u.normalized_email AS email,u.admin_role,a.email_confirmed_at,a.banned_until,a.user_metadata,a.created_at,a.updated_at,a.is_anonymous FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id WHERE a.deleted_at IS NULL`;
const parse=(v:unknown)=>{try{return typeof v==='string'?JSON.parse(v) as Row:{};}catch{return {};}};
// Same shape as GoTrue's User object for the fields the app reads.
export function toAuthUser(r:Row){
 const role=typeof r.admin_role==='string'?r.admin_role:null;
 return {id:r.id,aud:'authenticated',role:'authenticated',email:r.email,email_confirmed_at:r.email_confirmed_at??null,confirmed_at:r.email_confirmed_at??null,phone:'',
  created_at:r.created_at,updated_at:r.updated_at,last_sign_in_at:null,banned_until:r.banned_until??null,is_anonymous:r.is_anonymous===1,
  app_metadata:{provider:'email',providers:['email'],...(role?{admin_role:role}:{})},user_metadata:parse(r.user_metadata),identities:[]};
}
function banUntil(duration:unknown,now:number){
 if(duration==='none')return null;
 const m=String(duration??'').match(/^(\d+)(h|m|s)$/);if(!m)throw new Error('invalid ban_duration');
 return new Date(now+Number(m[1])*({h:3600_000,m:60_000,s:1000} as Record<string,number>)[m[2]]).toISOString();
}
const normalize=(email:unknown)=>String(email??'').trim().toLowerCase();

export function createNativeAuthAdmin(db:AuthAdminDb,options:Options){
 const now=()=>(options.now??Date.now)();
 const seal=async(password:string,userId:string)=>sealLegacyBcryptHash(await bcrypt.hash(password,10),options.credentialKey,{projectId:options.projectId,userId});
 const byId=async(id:string)=>UUID.test(id)?db.first(`${SELECT} AND u.id=?1`,[id]):null;
 return {
  async listUsers(params:{page?:number;perPage?:number}={}){
   const perPage=Math.max(1,Math.min(Number(params.perPage??50),1000)),page=Math.max(1,Number(params.page??1));
   const total=Number((await db.first(`SELECT count(*) AS n FROM d1_auth_accounts a WHERE a.deleted_at IS NULL`,[]))?.n??0);
   const rows=await db.all(`${SELECT} ORDER BY a.created_at,u.id LIMIT ?1 OFFSET ?2`,[perPage,(page-1)*perPage]);
   const last=Math.max(1,Math.ceil(total/perPage));
   return {data:{users:rows.map(toAuthUser),aud:'authenticated',nextPage:page<last?page+1:null,lastPage:last,total},error:null};
  },
  async getUserById(id:string){const r=await byId(id);return r?{data:{user:toAuthUser(r)},error:null}:fail('User not found',404,'user_not_found');},
  async createUser(input:{email?:string;password?:string;email_confirm?:boolean;user_metadata?:Row;app_metadata?:Row}){
   const email=normalize(input.email),t=new Date(now()).toISOString();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>320)return fail('Unable to validate email address: invalid format',400,'email_address_invalid');
   if(input.password!==undefined&&!validNativeNewPassword(input.password))return fail('Password should be at least 8 characters.',422,'weak_password');
   if(await db.first(`SELECT 1 FROM d1_access_users WHERE normalized_email=?1`,[email]))return fail('A user with this email address has already been registered',422,'email_exists');
   const id=crypto.randomUUID(),cipher=input.password?await seal(input.password,id):null;
   const role=typeof input.app_metadata?.admin_role==='string'?input.app_metadata.admin_role:null;
   try{
    await db.run(`INSERT INTO d1_access_users(id,normalized_email,admin_role) VALUES(?1,?2,?3)`,[id,email,role]);
    await db.run(`INSERT INTO d1_auth_accounts(user_id,credential_ciphertext,email_confirmed_at,user_metadata,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?5)`,[id,cipher,input.email_confirm?t:null,JSON.stringify(input.user_metadata??{}),t]);
   }catch{return fail('A user with this email address has already been registered',422,'email_exists');}
   return {data:{user:toAuthUser((await byId(id))!)},error:null};
  },
  async updateUserById(id:string,attrs:{email?:string;password?:string;email_confirm?:boolean;user_metadata?:Row;app_metadata?:Row;ban_duration?:string}){
   const current=await byId(id);if(!current)return fail('User not found',404,'user_not_found');
   const t=now(),stamp=new Date(t).toISOString();
   if(attrs.password!==undefined&&!validNativeNewPassword(attrs.password))return fail('Password should be at least 8 characters.',422,'weak_password');
   if(attrs.email!==undefined){const e=normalize(attrs.email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return fail('Unable to validate email address: invalid format',400,'email_address_invalid');
    if(e!==current.email&&await db.first(`SELECT 1 FROM d1_access_users WHERE normalized_email=?1`,[e]))return fail('A user with this email address has already been registered',422,'email_exists');
    await db.run(`UPDATE d1_access_users SET normalized_email=?2 WHERE id=?1`,[id,e]);}
   if(attrs.app_metadata&&'admin_role' in attrs.app_metadata)await db.run(`UPDATE d1_access_users SET admin_role=?2 WHERE id=?1`,[id,typeof attrs.app_metadata.admin_role==='string'?attrs.app_metadata.admin_role:null]);
   // GoTrue replaces user_metadata keys shallowly (merge), same here.
   const meta=attrs.user_metadata?JSON.stringify({...parse(current.user_metadata),...attrs.user_metadata}):null;
   const cipher=attrs.password?await seal(attrs.password,id):null;
   let ban:string|null|undefined;try{ban=attrs.ban_duration===undefined?undefined:banUntil(attrs.ban_duration,t);}catch{return fail('invalid ban_duration',400,'validation_failed');}
   await db.run(`UPDATE d1_auth_accounts SET credential_ciphertext=coalesce(?2,credential_ciphertext),user_metadata=coalesce(?3,user_metadata),email_confirmed_at=CASE WHEN ?4=1 THEN coalesce(email_confirmed_at,?6) ELSE email_confirmed_at END,
    banned_until=CASE WHEN ?5=1 THEN ?7 ELSE banned_until END,session_version=session_version+CASE WHEN ?5=1 AND ?7 IS NOT NULL THEN 1 ELSE 0 END,updated_at=?6 WHERE user_id=?1`,
    [id,cipher,meta,attrs.email_confirm?1:0,ban===undefined?0:1,stamp,ban??null]);
   return {data:{user:toAuthUser((await byId(id))!)},error:null};
  },
  async deleteUser(id:string){
   const current=await byId(id);if(!current)return fail('User not found',404,'user_not_found');
   const stamp=new Date(now()).toISOString();
   // Keep the row (UUID history for orders/progress); free the email like GoTrue.
   await db.run(`UPDATE d1_auth_accounts SET deleted_at=?2,credential_ciphertext=NULL,session_version=session_version+1,updated_at=?2 WHERE user_id=?1`,[id,stamp]);
   await db.run(`UPDATE d1_access_users SET normalized_email=?2 WHERE id=?1`,[id,`deleted+${id}@deleted.invalid`]);
   await db.run(`UPDATE d1_auth_sessions SET revoked_at=?2 WHERE user_id=?1 AND revoked_at IS NULL`,[id,stamp]);
   return {data:{user:null},error:null};
  },
  async generateLink(input:{type:string;email:string}){
   if(input.type!=='recovery')return fail(`generateLink type ${input.type} is not available in native mode`,400,'validation_failed');
   if(!options.nativeAuthority||!options.recoveryDb)return fail('Native recovery unavailable',503);
   const r=await requestNativeRecovery(options.recoveryDb as Parameters<typeof requestNativeRecovery>[0],input.email,{nativeAuthority:options.nativeAuthority,credentialKey:options.credentialKey,now:()=>now()}).catch(()=>null);
   if(!r)return fail('Native recovery unavailable',503);
   if(r.status!=='issued')return fail('User not found',404,'user_not_found');
   return {data:{user:null,properties:{hashed_token:r.token,action_link:null,verification_type:'recovery',email_otp:null,redirect_to:null}},error:null};
  },
 };
}

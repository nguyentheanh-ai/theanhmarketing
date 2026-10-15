import bcrypt from 'bcryptjs';
import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {assertD1AuthMirrorReady,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';
import {openLegacyBcryptHash,sealLegacyBcryptHash,verifyLegacyBcryptPassword} from '@/lib/cloudflare/legacy-password';
type Options={projectId:string;credentialKey:string;sessionTtlMs:number;allowedUserIds:readonly string[];refreshFamilies?:boolean;now?:number};
type Input={token:string;operationId:string;currentPassword:string;newPassword:string};
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,TOKEN=/^[A-Za-z0-9_-]{43}$/;
const done=()=>({changed:true as const,reauthenticate:true as const});
async function sha(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function requestDigest(input:Input,options:Options,oldHash:string){
 if(!TOKEN.test(options.credentialKey))throw Error('Credential change unavailable');
 const raw=Uint8Array.from(atob(options.credentialKey.replaceAll('-','+').replaceAll('_','/')+'='),c=>c.charCodeAt(0));if(raw.length!==32)throw Error('Credential change unavailable');
 const key=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const value=JSON.stringify(['native-password-change-v1',options.projectId,input.operationId,oldHash,input.currentPassword,input.newPassword]);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
}
export function validNativeNewPassword(value:unknown):value is string{return typeof value==='string'&&value.length>=8&&new TextEncoder().encode(value).length<=72&&!/[\u0000]|\p{Surrogate}/u.test(value);}
// Explicit, cohort-only native writer. Successful change revokes every previous
// session and requires a new login; retry recovers status only, never a token.
export async function changeD1Password(db:AuthDatabase,input:Input,options:Options){
 if(!validNativeNewPassword(input.newPassword)||input.newPassword===input.currentPassword)throw new RangeError('Invalid new password');
 if(!/^[a-z0-9]{20}$/.test(options.projectId)||!Array.isArray(options.allowedUserIds)||options.allowedUserIds.length>10||new Set(options.allowedUserIds).size!==options.allowedUserIds.length||options.allowedUserIds.some(v=>!UUID.test(v)))throw Error('Credential change unavailable');
 if(!options.allowedUserIds.length||!UUID.test(input.operationId)||!TOKEN.test(input.token)||typeof input.currentPassword!=='string'||!input.currentPassword||new TextEncoder().encode(input.currentPassword).length>4096)return null;
 const time=()=>options.now??Date.now();if(!Number.isFinite(time()))throw Error('Credential change unavailable');
 const oldHash=await sha(input.token),digest=await requestDigest(input,options,oldHash);
 async function retry(){
  const op=await db.first('SELECT * FROM d1_auth_credential_operations WHERE id=?1',[input.operationId]);if(!op)return undefined;
  if(op.status!=='done'||op.project_id!==options.projectId||op.old_session_hash!==oldHash||op.request_digest!==digest||typeof op.user_id!=='string'||!options.allowedUserIds.includes(op.user_id)||!(Date.parse(String(op.created_at))<=time())||!(Date.parse(String(op.retry_until))>time()))return null;
  return options.refreshFamilies===true?{...done(),clearCookies:false}:done();
 }
 const replay=await retry();if(replay!==undefined)return replay;
 const session=await getD1AuthSession(db,input.token,options);if(!session)return null;
 const row=await db.first('SELECT * FROM d1_auth_accounts WHERE user_id=?1',[session.user.id]);
 if(!row||typeof row.credential_ciphertext!=='string'||typeof row.user_metadata!=='string'||typeof row.updated_at!=='string'||!Number.isSafeInteger(row.session_version)||Number(row.session_version)>=Number.MAX_SAFE_INTEGER)return null;
 const oldCipher=row.credential_ciphertext,hash=await openLegacyBcryptHash(oldCipher,options.credentialKey,{projectId:options.projectId,userId:session.user.id});
 if(!await verifyLegacyBcryptPassword(input.currentPassword,hash))return null;
 const nextHash=await bcrypt.hash(input.newPassword,10),cipher=await sealLegacyBcryptHash(nextHash,options.credentialKey,{projectId:options.projectId,userId:session.user.id});
 const mirror=await assertD1AuthMirrorReady(db,{projectId:options.projectId,now:time()}),stamp=mirror.stamp;
 const params:(string|number|null)[]=[input.operationId,oldHash,options.projectId,session.user.id,oldCipher,Number(row.session_version),cipher,Number(row.session_version)+1,stamp,new Date(Date.parse(stamp)+120000).toISOString(),digest,JSON.stringify(options.allowedUserIds),mirror.floor,session.user.email,row.user_metadata,row.updated_at,Number(row.must_change_password)];
 const ready=`${authMirrorReadySql(3,13,9)} AND EXISTS(SELECT 1 FROM json_each(?12) cohort WHERE cohort.value=?4)`;
 const active=`a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?9) AND a.deleted_at IS NULL AND a.is_anonymous=0 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?9))`;
 const old=`EXISTS(SELECT 1 FROM d1_auth_accounts a JOIN d1_access_users u ON u.id=a.user_id JOIN d1_auth_sessions s ON s.user_id=a.user_id WHERE a.user_id=?4 AND u.normalized_email=?14 AND a.credential_ciphertext=?5 AND a.session_version=?6 AND a.user_metadata=?15 AND a.updated_at=?16 AND a.must_change_password=?17 AND s.token_hash=?2 AND s.project_id=?3 AND s.revoked_at IS NULL AND julianday(s.expires_at)>julianday(?9) AND s.session_version=a.session_version AND ${active}) AND ${ready}`;
 const pending=`EXISTS(SELECT 1 FROM d1_auth_credential_operations WHERE id=?1 AND project_id=?3 AND user_id=?4 AND old_session_hash=?2 AND request_digest=?11 AND expected_version=?6 AND target_version=?8 AND status='pending')`;
 const metadata=`json_set(?15,'$.must_change_password',json('false'),'$.password_changed_at',?9)`;
 const updated=`EXISTS(SELECT 1 FROM d1_auth_accounts a JOIN d1_access_users u ON u.id=a.user_id WHERE a.user_id=?4 AND u.normalized_email=?14 AND a.credential_ciphertext=?7 AND a.session_version=?8 AND a.must_change_password=0 AND a.user_metadata=${metadata} AND a.updated_at=?9 AND ${active}) AND ${ready}`;
 const refreshRevoked=options.refreshFamilies===true?` AND NOT EXISTS(SELECT 1 FROM d1_auth_refresh_families WHERE user_id=?4 AND project_id=?3 AND revoked_at IS NULL)`:'';
 const revoked=`NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE user_id=?4 AND project_id=?3 AND revoked_at IS NULL)${refreshRevoked}`;
 const statement=(sql:string)=>({sql,params:params.slice(0,Math.max(...Array.from(sql.matchAll(/\?(\d+)/g),m=>Number(m[1]))))});
 try{
  const result=await db.batch([
   statement(`INSERT INTO d1_auth_credential_operations(id,project_id,user_id,old_session_hash,request_digest,expected_version,target_version,status,created_at,retry_until) SELECT ?1,?3,?4,?2,?11,?6,?8,'pending',?9,?10 WHERE ${old}`),
   statement(`UPDATE d1_auth_accounts SET credential_ciphertext=?7,session_version=?8,must_change_password=0,user_metadata=${metadata},updated_at=?9 WHERE user_id=?4 AND ${pending} AND ${old}`),
   statement(`UPDATE d1_auth_sessions SET revoked_at=?9 WHERE user_id=?4 AND project_id=?3 AND revoked_at IS NULL AND ${pending} AND ${updated}`),
   ...(options.refreshFamilies===true?[statement(`UPDATE d1_auth_refresh_families SET revoked_at=?9 WHERE user_id=?4 AND project_id=?3 AND revoked_at IS NULL AND ${pending} AND ${updated}`)]:[]),
   statement(`UPDATE d1_auth_credential_operations SET status='done' WHERE id=?1 AND ${pending} AND ${updated} AND ${revoked}`),
   statement(`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_auth_credential_operations WHERE id=?1 AND status='done' AND user_id=?4 AND project_id=?3 AND old_session_hash=?2 AND request_digest=?11 AND expected_version=?6 AND target_version=?8) AND ${updated} AND ${revoked} THEN 1 ELSE abs(-9223372036854775808) END AS changed`),
  ]);
  if(result.at(-1)?.results?.[0]?.changed!==1)throw Error('Credential change outcome unavailable');
  return options.refreshFamilies===true?{...done(),clearCookies:true}:done();
 }catch{
  const recovered=await retry();if(recovered)return recovered;
  const current=await db.first('SELECT credential_ciphertext,session_version,user_metadata,updated_at FROM d1_auth_accounts WHERE user_id=?1',[session.user.id]);
  if(!current||current.credential_ciphertext!==oldCipher||current.session_version!==row.session_version||current.user_metadata!==row.user_metadata||current.updated_at!==row.updated_at)return null;
  throw Error('Credential change unavailable');
 }
}

import {authProofDigest,authAuthorityContext,type AuthAuthorityPolicy} from '@/lib/cloudflare/auth-proof-domain';
import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {assertD1AuthMirrorReady,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';

// Backend candidate behind the default-off staging refresh gate. Native primary authority and legacy-cookie
// adoption remain separate gates; this never advances a source mirror marker.
export type RefreshFamilyPolicy=AuthAuthorityPolicy&{
 now?:number;sessionTtlMs:number;maxSnapshotAgeMs?:number;allowedUserIds?:readonly string[];
 activeKeyId:string;keys:Readonly<Record<string,string>>;
 absoluteTtlMs:number|null;idleTimeoutMs:number|null;reuseIntervalMs:number;rememberLogin?:boolean;
 allowFamilyAttempt?:(identity:{projectId:string;userId:string;familyId:string})=>Promise<{allowed:boolean;retryAfter:number}>;
};
const columns=['family_id','project_id','user_id','session_version','generation','current_hash','refresh_key_id','access_serial','current_access_hash','access_key_id','access_created_at','access_expires_at','created_at','last_used_at','absolute_expires_at','idle_timeout_ms','reuse_interval_ms','remember_login','bootstrap_access_hash','bootstrap_retry_until','last_operation_id','revoked_at','policy_digest'] as const;
type Family=Record<typeof columns[number],string|number|null>;
type Context={stamp:string;floor:string;cohort:string;digest:string;policy:RefreshFamilyPolicy};
type Statement={sql:string;params:(string|number|null)[]};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH=/^[0-9a-f]{64}$/,TOKEN=/^[A-Za-z0-9_-]{43}$/,KEY_ID=/^[A-Za-z0-9_-]{1,64}$/;
const unavailable=()=>new Error('Native refresh family unavailable');
export class RefreshFamilyRateLimited extends Error {constructor(public readonly retryAfter:number){super('Native refresh rate limited');}}
async function allowFamily(p:RefreshFamilyPolicy,family:string,user:string){if(p.allowFamilyAttempt){const d=await p.allowFamilyAttempt({projectId:p.projectId,userId:user,familyId:family});if(!d.allowed)throw new RefreshFamilyRateLimited(d.retryAfter);}}
function tokenValid(value:string){try{return TOKEN.test(value)&&btoa(atob(value.replaceAll('-','+').replaceAll('_','/')+'=')).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')===value;}catch{return false;}}
async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
function policyTime(p:RefreshFamilyPolicy){return p.now??Date.now();}
function keyBytes(p:RefreshFamilyPolicy,id:string){
 if(!Object.hasOwn(p.keys,id)||!tokenValid(p.keys[id]))throw unavailable();
 return Uint8Array.from(atob(p.keys[id].replaceAll('-','+').replaceAll('_','/')+'='),c=>c.charCodeAt(0));
}
async function derive(p:RefreshFamilyPolicy,kind:'access'|'refresh',family:string,serial:number,keyId:string){
 const key=await crypto.subtle.importKey('raw',keyBytes(p,keyId),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const value=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify(p.nativeAuthority?['tam-native-family-v2',authAuthorityContext(p),kind,p.projectId,family,serial]:['tam-native-family-v1',kind,p.projectId,family,serial])));
 return btoa(String.fromCharCode(...new Uint8Array(value))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
export function assertD1RefreshFamilyPolicy(p:RefreshFamilyPolicy){
 const now=policyTime(p),ids=p.allowedUserIds;
 if(!/^[a-z0-9]{20}$/.test(p.projectId)||!Number.isFinite(now)||!Number.isSafeInteger(p.sessionTtlMs)||p.sessionTtlMs<1000||p.sessionTtlMs>30*86400000||
 ![p.absoluteTtlMs,p.idleTimeoutMs].every(v=>v===null||Number.isSafeInteger(v)&&v>0&&v<=400*86400000)||!Number.isSafeInteger(p.reuseIntervalMs)||p.reuseIntervalMs<0||p.reuseIntervalMs>60000||
 !p.keys||typeof p.keys!=='object'||Array.isArray(p.keys)||Object.keys(p.keys).length<1||Object.keys(p.keys).length>4||Object.keys(p.keys).some(id=>!KEY_ID.test(id))||!KEY_ID.test(p.activeKeyId)||
 (ids!==undefined&&(!Array.isArray(ids)||ids.length>100||ids.some(id=>!UUID.test(id))||new Set(ids).size!==ids.length)))throw unavailable();
 keyBytes(p,p.activeKeyId);
 authAuthorityContext(p);
}
async function context(db:AuthDatabase,p:RefreshFamilyPolicy):Promise<Context>{
 assertD1RefreshFamilyPolicy(p);const now=policyTime(p),ids=p.allowedUserIds;
 const mirror=await assertD1AuthMirrorReady(db,{...p,now});
 const digest=await hash(JSON.stringify(p.nativeAuthority?[p.sessionTtlMs,p.absoluteTtlMs,p.idleTimeoutMs,p.reuseIntervalMs,authAuthorityContext(p)]:[p.sessionTtlMs,p.absoluteTtlMs,p.idleTimeoutMs,p.reuseIntervalMs]));
 return {...mirror,cohort:ids===undefined?'null':JSON.stringify(ids),digest,policy:p};
}
function cohortSql(){return `(?4='null' OR EXISTS(SELECT 1 FROM json_each(?4) allowed WHERE allowed.value=f.user_id))`;}
function accountSql(){return `EXISTS(SELECT 1 FROM d1_auth_accounts a WHERE a.user_id=f.user_id AND a.session_version=f.session_version AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?2) AND a.deleted_at IS NULL AND a.is_anonymous=0 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?2)))`;}
function activeSql(c:Context){return `f.project_id=?1 AND f.revoked_at IS NULL AND f.policy_digest=?10 AND julianday(f.created_at)<=julianday(?2) AND julianday(f.last_used_at)<=julianday(?2)
 AND (f.absolute_expires_at IS NULL OR julianday(f.absolute_expires_at)>julianday(?2))
 AND (f.idle_timeout_ms IS NULL OR CAST(round((julianday(?2)-julianday(f.last_used_at))*86400000) AS INTEGER)<f.idle_timeout_ms)
 AND ${accountSql()} AND ${authMirrorReadySql(1,3,2,c.policy.nativeAuthority)} AND ${cohortSql()}
 AND EXISTS(SELECT 1 FROM d1_auth_sessions live WHERE live.token_hash=f.current_access_hash AND live.family_id=f.family_id AND live.user_id=f.user_id AND live.project_id=f.project_id AND live.session_version=f.session_version AND live.revoked_at IS NULL)`;}
const fingerprint=(alias='f')=>`json_array(${columns.map(k=>alias+'.'+k).join(',')})`;
function checkedFamily(row:Record<string,unknown>):Family{
 for(const k of columns)if(row[k]!==null&&typeof row[k]!=='string'&&typeof row[k]!=='number')throw unavailable();
 if(!UUID.test(String(row.family_id))||!UUID.test(String(row.user_id))||!['current_hash','current_access_hash','bootstrap_access_hash','policy_digest'].every(k=>HASH.test(String(row[k])))||
 !['generation','access_serial','session_version'].every(k=>Number.isSafeInteger(row[k])&&Number(row[k])>0)||!KEY_ID.test(String(row.refresh_key_id))||!KEY_ID.test(String(row.access_key_id)))throw unavailable();
 return row as Family;
}
function verifyFamilyPolicy(f:Family,c:Context){
 const p=c.policy,created=Date.parse(String(f.created_at)),used=Date.parse(String(f.last_used_at)),accessCreated=Date.parse(String(f.access_created_at)),accessExpires=Date.parse(String(f.access_expires_at));
 const absolute=f.absolute_expires_at===null?null:Date.parse(String(f.absolute_expires_at));
 if(f.project_id!==p.projectId||f.reuse_interval_ms!==p.reuseIntervalMs||f.idle_timeout_ms!==p.idleTimeoutMs||f.policy_digest!==c.digest||
 ![created,used,accessCreated,accessExpires].every(Number.isFinite)||used<created||accessCreated<created||accessCreated>used||
 (p.absoluteTtlMs===null?absolute!==null:absolute!==created+p.absoluteTtlMs)||
 accessExpires!==Math.min(accessCreated+p.sessionTtlMs,absolute??Infinity)||Date.parse(String(f.bootstrap_retry_until))!==created+120000||
 ![0,1].includes(Number(f.remember_login))||Number(f.access_serial)<Number(f.generation)||Number(f.access_serial)>=Number.MAX_SAFE_INTEGER||Number(f.generation)>=Number.MAX_SAFE_INTEGER||!UUID.test(String(f.last_operation_id)))throw unavailable();
}
function parameters(c:Context,family='',op='',before='',next='',proof=''):(string|number|null)[]{return [c.policy.projectId,c.stamp,c.floor,c.cohort,family,op,before,next,proof,c.digest];}
function stmt(sql:string,p:(string|number|null)[]):Statement{
 const n=Math.max(0,...Array.from(sql.matchAll(/\?(\d+)/g),m=>Number(m[1])));return {sql,params:p.slice(0,n)};
}
async function familyBy(db:AuthDatabase,c:Context,where:string,proof:string){
 const row=await db.first(`SELECT f.* FROM d1_auth_refresh_families f WHERE ${activeSql(c)} AND ${where}`,parameters(c,'','','','',proof).map(v=>v===null?'':v));
 if(!row)return null;const f=checkedFamily(row);verifyFamilyPolicy(f,c);return f;
}
async function pair(db:AuthDatabase,f:Family,p:RefreshFamilyPolicy){
 const accessToken=await derive(p,'access',String(f.family_id),Number(f.access_serial),String(f.access_key_id));
 const refreshToken=await derive(p,'refresh',String(f.family_id),Number(f.generation),String(f.refresh_key_id));
 if(await authProofDigest(accessToken,p)!==f.current_access_hash||await authProofDigest(refreshToken,p)!==f.current_hash)throw unavailable();
 const current=await getD1AuthSession(db,accessToken,p);
 if(!current||current.user.id!==f.user_id||current.familyId!==f.family_id||current.expiresAt!==f.access_expires_at)throw unavailable();
 return {familyId:String(f.family_id),accessToken,refreshToken,expiresAt:String(f.access_expires_at),refreshExpiresAt:f.absolute_expires_at===null?null:String(f.absolute_expires_at),user:current.user,rememberLogin:f.remember_login===1};
}
function proofSql(kind:'bootstrap'|'current'|'replay'){
 if(kind==='current')return 'f.current_hash=?9';
 if(kind==='bootstrap')return `f.bootstrap_access_hash=?9 AND julianday(f.bootstrap_retry_until)>=julianday(?2) AND EXISTS(SELECT 1 FROM d1_auth_sessions original WHERE original.token_hash=?9 AND original.family_id=f.family_id AND original.project_id=f.project_id AND original.user_id=f.user_id AND original.session_version=f.session_version)`;
 return `EXISTS(SELECT 1 FROM d1_auth_refresh_receipts r WHERE r.old_hash=?9 AND r.family_id=f.family_id AND r.project_id=f.project_id AND r.old_generation<f.generation AND julianday(r.rotated_at)>=julianday(f.created_at) AND julianday(r.rotated_at)<=julianday(?2) AND (r.old_generation=f.generation-1 OR CAST(round((julianday(?2)-julianday(r.rotated_at))*86400000) AS INTEGER)<=f.reuse_interval_ms))`;
}
async function mutate(db:AuthDatabase,c:Context,old:Family,next:Family,inputHash:string,kind:'current'|'replay'|'bootstrap'){
 const p=parameters(c,String(old.family_id),String(next.last_operation_id),JSON.stringify(columns.map(k=>old[k])),JSON.stringify(next),inputHash);
 const won=`f.family_id=?5 AND f.last_operation_id=?6`;
 const still=`${won} AND ${activeSql(c)}`;
 const changes=columns.filter(k=>k!=='family_id').map(k=>`${k}=json_extract(?8,'$.${k}')`).join(',');
 const statements=[stmt(`UPDATE d1_auth_refresh_families AS f SET ${changes} WHERE f.family_id=?5 AND ${fingerprint()}=?7 AND ${activeSql(c)} AND ${proofSql(kind)}`,p)];
 statements.push(stmt(`INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at) SELECT f.current_access_hash,f.user_id,f.project_id,f.family_id,f.session_version,f.access_created_at,f.access_expires_at FROM d1_auth_refresh_families f WHERE ${won} AND ${accountSql()} AND ${authMirrorReadySql(1,3,2,c.policy.nativeAuthority)} AND ${cohortSql()} ON CONFLICT(token_hash) DO NOTHING`,p));
 if(kind==='current')statements.push(stmt(`INSERT INTO d1_auth_refresh_receipts(old_hash,project_id,family_id,old_generation,rotated_at) SELECT ?9,?1,f.family_id,json_extract(?8,'$.generation')-1,?2 FROM d1_auth_refresh_families f WHERE ${still}`,p));
 const receiptGuard=kind==='current'?`AND EXISTS(SELECT 1 FROM d1_auth_refresh_receipts r WHERE r.old_hash=?9 AND r.project_id=?1 AND r.family_id=f.family_id AND r.old_generation=f.generation-1 AND r.rotated_at=?2)`:`AND ${proofSql(kind)}`;
 // activeSql refers to the new access row; require exact values at commit, too.
 statements.push(stmt(`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_auth_refresh_families f JOIN d1_auth_sessions s ON s.token_hash=f.current_access_hash WHERE ${still} AND ${fingerprint()}=json_array(${columns.map(k=>`json_extract(?8,'$.${k}')`).join(',')}) AND s.project_id=f.project_id AND s.family_id=f.family_id AND s.user_id=f.user_id AND s.session_version=f.session_version AND s.revoked_at IS NULL AND s.created_at=f.access_created_at AND s.expires_at=f.access_expires_at AND julianday(s.expires_at)>julianday(?2) ${receiptGuard}) THEN 1 ELSE abs(-9223372036854775808) END AS valid`,p));
 try{const r=await db.batch(statements);if(r.length!==statements.length||r.at(-1)?.results?.[0]?.valid!==1)throw unavailable();return true;}catch{
  // The assertion rolls back even if a trigger corrupts the operation marker.
  // Only a separately committed competing state permits a bounded retry.
  const actual=await db.first('SELECT * FROM d1_auth_refresh_families WHERE family_id=?1 AND project_id=?2',[String(old.family_id),c.policy.projectId]);
  if(actual&&actual.last_operation_id!==next.last_operation_id&&JSON.stringify(columns.map(k=>actual[k]))!==JSON.stringify(columns.map(k=>old[k])))return false;
  throw unavailable();
 }
}
async function nextState(f:Family,c:Context,rotate:boolean){
 const p=c.policy,n={...f,last_used_at:c.stamp,last_operation_id:crypto.randomUUID()};
 if(rotate){n.generation=Number(f.generation)+1;n.refresh_key_id=p.activeKeyId;n.current_hash=await authProofDigest(await derive(p,'refresh',String(f.family_id),Number(n.generation),p.activeKeyId),p);}
 if(rotate||Date.parse(String(f.access_expires_at))<=Date.parse(c.stamp)){
  n.access_serial=Number(f.access_serial)+1;n.access_key_id=p.activeKeyId;n.access_created_at=c.stamp;
  n.access_expires_at=new Date(Math.min(Date.parse(c.stamp)+p.sessionTtlMs,f.absolute_expires_at===null?Infinity:Date.parse(String(f.absolute_expires_at)))).toISOString();
  n.current_access_hash=await authProofDigest(await derive(p,'access',String(f.family_id),Number(n.access_serial),p.activeKeyId),p);
 }
 return n;
}
export async function attachD1RefreshFamily(db:AuthDatabase,accessToken:string,p:RefreshFamilyPolicy){
 if(!tokenValid(accessToken))return null;const inputHash=await authProofDigest(accessToken,p);let rateChecked=false;
 for(let attempt=0;attempt<3;attempt++){
  const c=await context(db,p),existing=await familyBy(db,c,proofSql('bootstrap'),inputHash);
  if(existing){if(!rateChecked){await allowFamily(p,String(existing.family_id),String(existing.user_id));rateChecked=true;}const next=await nextState(existing,c,false);if(await mutate(db,c,existing,next,inputHash,'bootstrap'))return pair(db,next,p);continue;}
  const authenticated=await getD1AuthSession(db,accessToken,p);if(!authenticated)return null;
  if(!rateChecked){await allowFamily(p,authenticated.familyId,authenticated.user.id);rateChecked=true;}
  const row=await db.first('SELECT session_version FROM d1_auth_accounts WHERE user_id=?1',[authenticated.user.id]);if(!row||!Number.isSafeInteger(row.session_version))throw unavailable();
  const family=authenticated.familyId,op=crypto.randomUUID(),absolute=p.absoluteTtlMs===null?null:new Date(Date.parse(c.stamp)+p.absoluteTtlMs).toISOString();
  const refresh=await derive(p,'refresh',family,1,p.activeKeyId),access=await derive(p,'access',family,1,p.activeKeyId);
  const f:Family={family_id:family,project_id:p.projectId,user_id:authenticated.user.id,session_version:Number(row.session_version),generation:1,current_hash:await authProofDigest(refresh,p),refresh_key_id:p.activeKeyId,access_serial:1,current_access_hash:await authProofDigest(access,p),access_key_id:p.activeKeyId,access_created_at:c.stamp,access_expires_at:new Date(Math.min(Date.parse(c.stamp)+p.sessionTtlMs,absolute===null?Infinity:Date.parse(absolute))).toISOString(),created_at:c.stamp,last_used_at:c.stamp,absolute_expires_at:absolute,idle_timeout_ms:p.idleTimeoutMs,reuse_interval_ms:p.reuseIntervalMs,remember_login:p.rememberLogin===true?1:0,bootstrap_access_hash:inputHash,bootstrap_retry_until:new Date(Date.parse(c.stamp)+120000).toISOString(),last_operation_id:op,revoked_at:null,policy_digest:c.digest};
  checkedFamily(f);verifyFamilyPolicy(f,c);
  const params=parameters(c,family,op,'',JSON.stringify(f),inputHash);
  const original=`s.token_hash=?9 AND s.project_id=?1 AND s.family_id=?5 AND s.user_id=json_extract(?8,'$.user_id') AND s.session_version=a.session_version AND a.session_version=json_extract(?8,'$.session_version') AND s.revoked_at IS NULL AND julianday(s.expires_at)>julianday(?2) AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?2) AND a.deleted_at IS NULL AND a.is_anonymous=0 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?2)) AND ${authMirrorReadySql(1,3,2,c.policy.nativeAuthority)} AND (?4='null' OR EXISTS(SELECT 1 FROM json_each(?4) allowed WHERE allowed.value=s.user_id))`;
  const won='f.family_id=?5 AND f.project_id=?1 AND f.last_operation_id=?6';
  const ss=[stmt(`INSERT INTO d1_auth_refresh_families(${columns.join(',')}) SELECT ${columns.map(k=>`json_extract(?8,'$.${k}')`).join(',')} FROM d1_auth_sessions s JOIN d1_auth_accounts a ON a.user_id=s.user_id WHERE ${original} ON CONFLICT(family_id) DO NOTHING`,params),
   stmt(`INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at) SELECT f.current_access_hash,f.user_id,f.project_id,f.family_id,f.session_version,f.access_created_at,f.access_expires_at FROM d1_auth_refresh_families f WHERE ${won} AND ${accountSql()} AND ${authMirrorReadySql(1,3,2,c.policy.nativeAuthority)} AND ${cohortSql()} ON CONFLICT(token_hash) DO NOTHING`,params),
   stmt(`UPDATE d1_auth_sessions SET revoked_at=?2 WHERE token_hash=?9 AND project_id=?1 AND family_id=?5 AND EXISTS(SELECT 1 FROM d1_auth_refresh_families f WHERE ${won} AND ${activeSql(c)})`,params),
   stmt(`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_auth_refresh_families f WHERE ${won} AND ${activeSql(c)} AND ${fingerprint()}=json_array(${columns.map(k=>`json_extract(?8,'$.${k}')`).join(',')})) AND EXISTS(SELECT 1 FROM d1_auth_sessions WHERE token_hash=?9 AND project_id=?1 AND family_id=?5 AND revoked_at=?2) THEN 1 ELSE abs(-9223372036854775808) END AS valid`,params)];
  try{const results=await db.batch(ss);if(results.length!==ss.length||results.at(-1)?.results?.[0]?.valid!==1)throw unavailable();return pair(db,f,p);}catch{
   const actual=await db.first('SELECT * FROM d1_auth_refresh_families WHERE family_id=?1 AND project_id=?2',[family,p.projectId]);
   if(actual&&actual.last_operation_id!==op&&actual.bootstrap_access_hash===inputHash)continue;
   if(actual&&actual.last_operation_id!==op)return null;
   throw unavailable();
  }
 }
 throw unavailable();
}
async function revokeFamilyRow(db:AuthDatabase,f:Family,stamp:string,cohort:string,expectedFingerprint?:string){
 const op=crypto.randomUUID(),p:(string|number|null)[]=[f.project_id,stamp,f.family_id,f.user_id,op,cohort,expectedFingerprint??null];
 const scope=`f.project_id=?1 AND f.family_id=?3 AND f.user_id=?4 AND (?6='null' OR EXISTS(SELECT 1 FROM json_each(?6) allowed WHERE allowed.value=f.user_id))`;
 const ss=[stmt(`UPDATE d1_auth_refresh_families AS f SET revoked_at=coalesce(revoked_at,?2),last_operation_id=?5 WHERE ${scope} AND (?7 IS NULL OR ${fingerprint()}=?7)`,p),stmt(`UPDATE d1_auth_sessions SET revoked_at=coalesce(revoked_at,?2) WHERE project_id=?1 AND family_id=?3 AND user_id=?4 AND EXISTS(SELECT 1 FROM d1_auth_refresh_families f WHERE ${scope} AND f.last_operation_id=?5 AND f.revoked_at IS NOT NULL)`,p),stmt(`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_auth_refresh_families f WHERE ${scope} AND f.last_operation_id=?5 AND f.revoked_at IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE project_id=?1 AND family_id=?3 AND user_id=?4 AND revoked_at IS NULL) THEN 1 ELSE abs(-9223372036854775808) END AS valid`,p)];
 try{const r=await db.batch(ss);if(r.length!==ss.length||r.at(-1)?.results?.[0]?.valid!==1)throw unavailable();return true;}catch{
  const actual=await db.first('SELECT * FROM d1_auth_refresh_families WHERE family_id=?1 AND project_id=?2',[String(f.family_id),String(f.project_id)]);
  if(actual&&actual.last_operation_id!==op&&expectedFingerprint&&JSON.stringify(columns.map(k=>actual[k]))!==expectedFingerprint)return false;
  throw unavailable();
 }
}
export async function refreshD1Family(db:AuthDatabase,refreshToken:string,p:RefreshFamilyPolicy){
 if(!tokenValid(refreshToken))return null;const inputHash=await authProofDigest(refreshToken,p);let rateChecked=false;
 for(let attempt=0;attempt<3;attempt++){
  const c=await context(db,p),f=await familyBy(db,c,`(f.current_hash=?9 OR EXISTS(SELECT 1 FROM d1_auth_refresh_receipts r WHERE r.old_hash=?9 AND r.family_id=f.family_id AND r.project_id=f.project_id))`,inputHash);if(!f)return null;
  if(!rateChecked){await allowFamily(p,String(f.family_id),String(f.user_id));rateChecked=true;}
  const rotate=f.current_hash===inputHash;
  if(!rotate){const receipt=await db.first('SELECT old_generation,rotated_at FROM d1_auth_refresh_receipts WHERE old_hash=?1 AND project_id=?2 AND family_id=?3',[inputHash,p.projectId,String(f.family_id)]);
   if(!receipt||!Number.isSafeInteger(receipt.old_generation)||Number(receipt.old_generation)<1||Number(receipt.old_generation)>=Number(f.generation)||!Number.isFinite(Date.parse(String(receipt.rotated_at)))||Date.parse(String(receipt.rotated_at))<Date.parse(String(f.created_at))||Date.parse(String(receipt.rotated_at))>Date.parse(c.stamp))throw unavailable();
   if(receipt.old_generation!==Number(f.generation)-1&&Date.parse(c.stamp)-Date.parse(String(receipt.rotated_at))>Number(f.reuse_interval_ms)){
    if(await revokeFamilyRow(db,f,c.stamp,c.cohort,JSON.stringify(columns.map(k=>f[k]))))return null;continue;
   }
  }
  const next=await nextState(f,c,rotate);if(await mutate(db,c,f,next,inputHash,rotate?'current':'replay'))return pair(db,next,p);
 }
 throw unavailable();
}
// Revocation of one's own family is safe even when source-mirror reads fail.
// No client user/family/role claim is accepted. Any issued access lease in that
// family identifies the scope; expiry does not make self-revocation unsafe.
export type FamilyRevocationOutcome='revoked'|'replayed'|'invalid';
export async function revokeD1RefreshFamilyOutcome(db:AuthDatabase,accessToken:string,p:RefreshFamilyPolicy):Promise<FamilyRevocationOutcome>{
 if(!tokenValid(accessToken)||!Number.isFinite(policyTime(p))||!/^[a-z0-9]{20}$/.test(p.projectId))return 'invalid';
 const ids=p.allowedUserIds;if(ids!==undefined&&(!Array.isArray(ids)||ids.some(id=>!UUID.test(id))||new Set(ids).size!==ids.length||ids.length>100))throw unavailable();
 const h=await authProofDigest(accessToken,p);let limited=false;
 for(let attempt=0;attempt<3;attempt++){
  const row=await db.first(`SELECT f.* FROM d1_auth_refresh_families f JOIN d1_auth_sessions s ON s.family_id=f.family_id AND s.project_id=f.project_id AND s.user_id=f.user_id WHERE s.token_hash=?1 AND f.project_id=?2`,[h,p.projectId]);
  if(!row||(ids!==undefined&&!ids.includes(String(row.user_id))))return 'invalid';
  const family=checkedFamily(row);
  if(family.revoked_at!==null){
   const live=await db.first('SELECT 1 AS live FROM d1_auth_sessions WHERE family_id=?1 AND project_id=?2 AND user_id=?3 AND revoked_at IS NULL LIMIT 1',[String(family.family_id),p.projectId,String(family.user_id)]);
   if(live)throw unavailable();return 'replayed';
  }
  if(!limited){await allowFamily(p,String(family.family_id),String(family.user_id));limited=true;}
  const won=await revokeFamilyRow(db,family,new Date(policyTime(p)).toISOString(),ids===undefined?'null':JSON.stringify(ids),JSON.stringify(columns.map(k=>family[k])));
  if(won)return 'revoked';
 }
 throw unavailable();
}
export async function revokeD1RefreshFamily(db:AuthDatabase,accessToken:string,p:RefreshFamilyPolicy){return (await revokeD1RefreshFamilyOutcome(db,accessToken,p))!=='invalid';}

// Global sign-out preserves the Source fields in the account. Its own ledger
// records revocation time and fences late retries from killing a newer login.
async function matchesAssociatedAccess(db:AuthDatabase,f:Family,p:RefreshFamilyPolicy,access?:string){
 if(access===undefined)return true;if(!tokenValid(access))return false;
 const row=await db.first('SELECT user_id,family_id FROM d1_auth_sessions WHERE token_hash=?1 AND project_id=?2',[await authProofDigest(access,p),p.projectId]);
 return row?.user_id===f.user_id&&row?.family_id===f.family_id;
}
export async function revokeD1RefreshFamilyByRefreshOutcome(db:AuthDatabase,token:string,p:RefreshFamilyPolicy,associatedAccess?:string):Promise<FamilyRevocationOutcome>{
 if(!tokenValid(token))return 'invalid';const c=await context(db,p),inputHash=await authProofDigest(token,p);
 const f=await familyBy(db,c,`(f.current_hash=?9 OR ${proofSql('replay')})`,inputHash);
 if(!f){
  const row=await db.first(`SELECT f.* FROM d1_auth_refresh_families f WHERE f.project_id=?1 AND (f.current_hash=?2 OR EXISTS(SELECT 1 FROM d1_auth_refresh_receipts r WHERE r.old_hash=?2 AND r.project_id=f.project_id AND r.family_id=f.family_id)) AND (?3='null' OR EXISTS(SELECT 1 FROM json_each(?3) allowed WHERE allowed.value=f.user_id))`,[p.projectId,inputHash,c.cohort]);
  if(!row||row.revoked_at===null)return 'invalid';const old=checkedFamily(row);if(!await matchesAssociatedAccess(db,old,p,associatedAccess))return 'invalid';
  const live=await db.first('SELECT 1 AS live FROM d1_auth_sessions WHERE family_id=?1 AND project_id=?2 AND user_id=?3 AND revoked_at IS NULL LIMIT 1',[String(old.family_id),p.projectId,String(old.user_id)]);if(live)throw unavailable();return 'replayed';
 }
 if(!await matchesAssociatedAccess(db,f,p,associatedAccess))return 'invalid';
 const access=await derive(p,'access',String(f.family_id),Number(f.access_serial),String(f.access_key_id));if(await authProofDigest(access,p)!==f.current_access_hash)throw unavailable();
 return revokeD1RefreshFamilyOutcome(db,access,p);
}

async function revokeAllFromProof(db:AuthDatabase,accessToken:string,p:RefreshFamilyPolicy,kind:'access'|'refresh',associatedAccess?:string):Promise<FamilyRevocationOutcome>{
 if(!tokenValid(accessToken))return 'invalid';
 // Legacy ledger column source_session_hash holds a proof digest. Refresh
 // proofs use a domain-separated digest; they are never stored as raw tokens.
 const c=await context(db,p),sourceHash=await authProofDigest(accessToken,p),ledgerHash=kind==='refresh'?await authProofDigest('tam-logout-refresh-v1:'+accessToken,p):sourceHash;
 const recover=async()=>{
  const done=await db.first(`SELECT user_id FROM d1_auth_session_security_operations WHERE project_id=?1 AND source_session_hash=?2 AND kind='global_logout' AND status='done' AND (?3='null' OR EXISTS(SELECT 1 FROM json_each(?3) allowed WHERE allowed.value=user_id))`,[p.projectId,ledgerHash,c.cohort]);return Boolean(done);
 };
 if(await recover())return 'replayed';
 const refreshFamily=kind==='refresh'?await familyBy(db,c,`(f.current_hash=?9 OR ${proofSql('replay')})`,sourceHash):null;
 const session=kind==='access'?await getD1AuthSession(db,accessToken,p):refreshFamily?{user:{id:String(refreshFamily.user_id)},familyId:String(refreshFamily.family_id)}:null;
 if(!session)return 'invalid';
 if(refreshFamily&&!await matchesAssociatedAccess(db,refreshFamily,p,associatedAccess))return 'invalid';
 await allowFamily(p,session.familyId,session.user.id);
 const account=await db.first('SELECT session_version FROM d1_auth_accounts WHERE user_id=?1',[session.user.id]);if(!account||!Number.isSafeInteger(account.session_version)||Number(account.session_version)>=Number.MAX_SAFE_INTEGER)throw unavailable();
 const params:(string|number|null)[]=[p.projectId,c.stamp,c.floor,c.cohort,session.user.id,sourceHash,crypto.randomUUID(),Number(account.session_version),Number(account.session_version)+1,ledgerHash,refreshFamily?String(refreshFamily.family_id):null,refreshFamily?JSON.stringify(columns.map(k=>refreshFamily[k])):null,c.digest,associatedAccess?await authProofDigest(associatedAccess,p):null];
 const ready=`${authMirrorReadySql(1,3,2,c.policy.nativeAuthority)} AND (?4='null' OR EXISTS(SELECT 1 FROM json_each(?4) allowed WHERE allowed.value=?5))`;
 const actorProof=kind==='access'?`EXISTS(SELECT 1 FROM d1_auth_sessions s WHERE s.token_hash=?6 AND s.project_id=?1 AND s.user_id=a.user_id AND s.session_version=a.session_version AND s.revoked_at IS NULL AND julianday(s.expires_at)>julianday(?2))`:
  `EXISTS(SELECT 1 FROM d1_auth_refresh_families f WHERE f.family_id=?11 AND f.user_id=a.user_id AND ${activeSql(c).replaceAll('?10','?13')} AND ${fingerprint()}=?12 AND (f.current_hash=?6 OR ${proofSql('replay').replaceAll('?9','?6')}) AND (?14 IS NULL OR EXISTS(SELECT 1 FROM d1_auth_sessions associated WHERE associated.token_hash=?14 AND associated.project_id=f.project_id AND associated.family_id=f.family_id AND associated.user_id=f.user_id)))`;
 const own=`a.user_id=?5 AND a.session_version=?8 AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?2) AND a.deleted_at IS NULL AND a.is_anonymous=0 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?2)) AND ${actorProof} AND ${ready}`;
 const pending=`EXISTS(SELECT 1 FROM d1_auth_session_security_operations o WHERE o.id=?7 AND o.project_id=?1 AND o.user_id=?5 AND o.source_session_hash=?10 AND o.expected_version=?8 AND o.target_version=?9 AND o.status='pending')`;
 const updated=`EXISTS(SELECT 1 FROM d1_auth_accounts WHERE user_id=?5 AND session_version=?9) AND ${ready}`;
 const none=`NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE project_id=?1 AND user_id=?5 AND revoked_at IS NULL) AND NOT EXISTS(SELECT 1 FROM d1_auth_refresh_families WHERE project_id=?1 AND user_id=?5 AND revoked_at IS NULL)`;
 const ss=[stmt(`INSERT INTO d1_auth_session_security_operations(id,project_id,user_id,source_session_hash,kind,expected_version,target_version,status,created_at) SELECT ?7,?1,a.user_id,?10,'global_logout',?8,?9,'pending',?2 FROM d1_auth_accounts a WHERE ${own}`,params),
  stmt(`UPDATE d1_auth_accounts AS a SET session_version=?9 WHERE ${pending} AND ${own}`,params),
  stmt(`UPDATE d1_auth_refresh_families SET revoked_at=coalesce(revoked_at,?2) WHERE project_id=?1 AND user_id=?5 AND ${pending} AND ${updated}`,params),
  stmt(`UPDATE d1_auth_sessions SET revoked_at=coalesce(revoked_at,?2) WHERE project_id=?1 AND user_id=?5 AND ${pending} AND ${updated}`,params),
  stmt(`UPDATE d1_auth_session_security_operations SET status='done' WHERE id=?7 AND ${pending} AND ${updated} AND ${none}`,params),
  stmt(`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_auth_session_security_operations WHERE id=?7 AND project_id=?1 AND user_id=?5 AND source_session_hash=?10 AND expected_version=?8 AND target_version=?9 AND status='done') AND ${updated} AND ${none} THEN 1 ELSE abs(-9223372036854775808) END AS valid`,params)];
 try{const result=await db.batch(ss);if(result.length!==ss.length||result.at(-1)?.results?.[0]?.valid!==1)throw unavailable();return 'revoked';}catch{if(await recover())return 'replayed';throw unavailable();}
}

export async function revokeAllD1RefreshFamiliesOutcome(db:AuthDatabase,token:string,p:RefreshFamilyPolicy){return revokeAllFromProof(db,token,p,'access');}
export async function revokeAllD1RefreshFamiliesByRefreshOutcome(db:AuthDatabase,token:string,p:RefreshFamilyPolicy,associatedAccess?:string){return revokeAllFromProof(db,token,p,'refresh',associatedAccess);}
export async function revokeAllD1RefreshFamilies(db:AuthDatabase,token:string,p:RefreshFamilyPolicy){return (await revokeAllD1RefreshFamiliesOutcome(db,token,p))!=='invalid';}

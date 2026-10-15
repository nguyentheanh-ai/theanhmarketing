import {assertD1AuthMirrorReady,authMirrorReadySql} from "@/lib/cloudflare/d1-auth-authority";
import { openLegacyBcryptHash, verifyLegacyBcryptPassword } from "@/lib/cloudflare/legacy-password";

// Backend Auth core. HTTP/native-page consumers must retain the policy gates.
// Caller must implement IP/email rate limiting before expensive verification,
// and set the returned opaque token only as a Secure/HttpOnly host-only cookie.
type Statement={sql:string;params:(string|number|null)[]};
export type AuthDatabase={
 first:(sql:string,params:readonly(string|number)[])=>Promise<Record<string,unknown>|null>;
 batch:(statements:readonly Statement[])=>Promise<{results?:Record<string,unknown>[]}[]>;
};
type Policy={projectId:string;now?:number;sessionTtlMs:number;maxSnapshotAgeMs?:number;allowedUserIds?:readonly string[]};
// Backend-only optional cohort. Undefined keeps the generic production core;
// an explicit empty list denies everyone. Never populate this from HTTP JSON.
function cohort(policy:Policy){
 const ids=policy.allowedUserIds;
 if(ids===undefined)return 'null';
 if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))||new Set(ids).size!==ids.length)throw new Error('Invalid Auth cohort');
 return JSON.stringify(ids);
}
function cohortSql(column:string,position:number){return `(?${position}='null' OR EXISTS(SELECT 1 FROM json_each(?${position}) allowed WHERE allowed.value=${column}))`;}
const ACTIVE=`a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?2)
 AND a.deleted_at IS NULL AND a.is_anonymous=0
 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?2))`;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
function now(policy:Policy){
 const value=policy.now??Date.now();
 cohort(policy);
 if(!/^[a-z0-9]{20}$/.test(policy.projectId)||!Number.isFinite(value)||!Number.isInteger(policy.sessionTtlMs)||policy.sessionTtlMs<1000||policy.sessionTtlMs>30*86400000)throw new Error("Invalid Auth policy");
 return value;
}
function opaque(){return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
async function digest(token:string){const value=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));return Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,"0")).join("");}
function profile(row:Record<string,unknown>){
 if(typeof row.user_id!=="string"||typeof row.normalized_email!=="string")throw new Error("Auth identity unavailable");
 return {id:row.user_id,email:row.normalized_email,adminRole:row.admin_role==="owner"||row.admin_role==="editor"?row.admin_role:null,mustChangePassword:row.must_change_password===1};
}
// Public synthetic hash, solely for equal-cost verification of unknown/inactive
// accounts. It never grants a session. Cost-10 can exceed Workers Free CPU.
const DUMMY_HASH="$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function authenticateD1Password(db:AuthDatabase,input:{email:string;password:string},
 options:Policy&{credentialKey:string;allowAttempt:()=>Promise<boolean>}){
 now(options);const email=input.email.trim().toLowerCase();
 if(!email||email.length>320||!input.password||new TextEncoder().encode(input.password).length>4096)return null;
 if(!await options.allowAttempt())return null;
 const mirror=await assertD1AuthMirrorReady(db,options),stamp=mirror.stamp;
 const row=await db.first(`SELECT u.id AS user_id,u.normalized_email,u.admin_role,a.* FROM d1_access_users u
  JOIN d1_auth_accounts a ON a.user_id=u.id WHERE u.normalized_email=?1 AND ${ACTIVE} AND ${authMirrorReadySql(3,4)} AND ${cohortSql('u.id',5)}`,[email,stamp,options.projectId,mirror.floor,cohort(options)]);
 if(!row||typeof row.credential_ciphertext!=="string"){
  await verifyLegacyBcryptPassword(input.password,DUMMY_HASH);return null;
 }
 const hash=await openLegacyBcryptHash(row.credential_ciphertext,options.credentialKey,{projectId:options.projectId,userId:String(row.user_id)});
 if(!await verifyLegacyBcryptPassword(input.password,hash))return null;
 const issued=now(options),issuedStamp=new Date(issued).toISOString(),issuedMirror=await assertD1AuthMirrorReady(db,{...options,now:issued});
 const token=opaque(),tokenHash=await digest(token),expiresAt=new Date(issued+options.sessionTtlMs).toISOString();
 // Password/email/status/version must still match after verification; changing
 // a credential while bcrypt is running cannot create a stale authenticated session.
 const result=await db.batch([{sql:`INSERT INTO d1_auth_sessions
  (token_hash,user_id,project_id,family_id,session_version,created_at,expires_at)
  SELECT ?3,a.user_id,?4,?5,a.session_version,?2,?6 FROM d1_auth_accounts a
  JOIN d1_access_users u ON u.id=a.user_id WHERE u.normalized_email=?1 AND ${ACTIVE}
   AND a.credential_ciphertext=?7 AND a.session_version=?8 AND ${authMirrorReadySql(4,9)} AND ${cohortSql('u.id',10)}
  RETURNING token_hash`,params:[email,issuedStamp,tokenHash,options.projectId,crypto.randomUUID(),expiresAt,row.credential_ciphertext,Number(row.session_version),issuedMirror.floor,cohort(options)]}]);
 if(!result[0]?.results?.length){await assertD1AuthMirrorReady(db,options);return null;}
 // Issuer cleanup is confined to this newly generated opaque token. It must
 // still revoke when the cohort is removed after INSERT; user logout remains
 // cohort-scoped and cannot revoke another principal's session.
 const cleanupPolicy={...options,allowedUserIds:undefined};
 let current;
 try{current=await getD1AuthSession(db,token,options);}catch{await revokeD1AuthSession(db,token,cleanupPolicy);throw new Error("Auth authority unavailable");}
 if(!current){await revokeD1AuthSession(db,token,cleanupPolicy);return null;}
 return {token,expiresAt,user:current.user};
}

export async function getD1AuthSession(db:AuthDatabase,token:string,policy:Policy){
 now(policy);if(!TOKEN.test(token))return null;
 const mirror=await assertD1AuthMirrorReady(db,policy),stamp=mirror.stamp;
 const row=await db.first(`SELECT u.id AS user_id,u.normalized_email,u.admin_role,a.must_change_password,s.family_id,s.expires_at
  FROM d1_auth_sessions s JOIN d1_auth_accounts a ON a.user_id=s.user_id JOIN d1_access_users u ON u.id=a.user_id
  WHERE s.token_hash=?1 AND s.project_id=?3 AND s.revoked_at IS NULL AND julianday(s.expires_at)>julianday(?2)
    AND s.session_version=a.session_version AND ${ACTIVE} AND ${authMirrorReadySql(3,4)} AND ${cohortSql('u.id',5)}`,[await digest(token),stamp,policy.projectId,mirror.floor,cohort(policy)]);
 if(!row){await assertD1AuthMirrorReady(db,policy);return null;}
 return {user:profile(row),expiresAt:String(row.expires_at),familyId:String(row.family_id)};
}

export async function rotateD1AuthSession(db:AuthDatabase,token:string,policy:Policy){
 now(policy);if(!TOKEN.test(token))return null;
 const mirror=await assertD1AuthMirrorReady(db,policy),stamp=mirror.stamp,time=Date.parse(stamp);
 const oldHash=await digest(token),next=opaque(),nextHash=await digest(next),expiry=new Date(time+policy.sessionTtlMs).toISOString();
 const eligible=`SELECT s.* FROM d1_auth_sessions s JOIN d1_auth_accounts a ON a.user_id=s.user_id
   WHERE s.token_hash=?1 AND s.project_id=?3 AND s.revoked_at IS NULL AND julianday(s.expires_at)>julianday(?2)
   AND s.session_version=a.session_version AND ${ACTIVE} AND ${authMirrorReadySql(3,6)} AND ${cohortSql('s.user_id',7)}`;
 const result=await db.batch([
  {sql:`INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at)
    SELECT ?4,e.user_id,e.project_id,e.family_id,e.session_version,?2,?5 FROM (${eligible}) e RETURNING user_id`,params:[oldHash,stamp,policy.projectId,nextHash,expiry,mirror.floor,cohort(policy)]},
  {sql:`UPDATE d1_auth_sessions SET revoked_at=?2 WHERE token_hash=?1 AND project_id=?3 AND revoked_at IS NULL
    AND EXISTS (SELECT 1 FROM d1_auth_sessions fresh WHERE fresh.token_hash=?4 AND fresh.family_id=d1_auth_sessions.family_id)`,params:[oldHash,stamp,policy.projectId,nextHash]},
 ]);
 if(!result[0]?.results?.length){await assertD1AuthMirrorReady(db,policy);return null;}
 return {token:next,expiresAt:expiry};
}

export async function revokeD1AuthSession(db:AuthDatabase,token:string,policy:Policy){
 const stamp=new Date(now(policy)).toISOString();if(!TOKEN.test(token))return false;
 const rows=await db.batch([{sql:`UPDATE d1_auth_sessions SET revoked_at=?2 WHERE token_hash=?1 AND project_id=?3
  AND revoked_at IS NULL AND ${cohortSql('d1_auth_sessions.user_id',4)} RETURNING user_id`,params:[await digest(token),stamp,policy.projectId,cohort(policy)]}]);
 return Boolean(rows[0]?.results?.length);
}

export async function revokeAllD1AuthSessions(db:AuthDatabase,currentToken:string,policy:Policy){
 now(policy);if(!TOKEN.test(currentToken))return false;
 const mirror=await assertD1AuthMirrorReady(db,policy),stamp=mirror.stamp;
 const rows=await db.batch([{sql:`UPDATE d1_auth_accounts SET session_version=session_version+1,updated_at=?2
  WHERE user_id IN (SELECT s.user_id FROM d1_auth_sessions s JOIN d1_auth_accounts a ON a.user_id=s.user_id
    WHERE s.token_hash=?1 AND s.project_id=?3 AND s.revoked_at IS NULL AND julianday(s.expires_at)>julianday(?2)
    AND s.session_version=a.session_version AND ${ACTIVE} AND ${authMirrorReadySql(3,4)} AND ${cohortSql('s.user_id',5)}) RETURNING user_id`,params:[await digest(currentToken),stamp,policy.projectId,mirror.floor,cohort(policy)]}]);
 return Boolean(rows[0]?.results?.length);
}

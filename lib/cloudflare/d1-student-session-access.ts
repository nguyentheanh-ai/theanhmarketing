import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {assertD1AuthMirrorReady,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';
import {readD1StudentCourseAccess} from '@/lib/cloudflare/d1-course-access';

const projectId='vsxxgdzwtscuxcmjfckt';
// Student read boundary for app A only. Caller provides an opaque cookie token,
// never a client-supplied subject/email/admin flag. No progress writes here.
export async function readD1StudentSessionAccess(db:AuthDatabase,token:string,policy:{sessionTtlMs:number;now?:number;allowedUserIds?:readonly string[]}){
 const now=policy.now??Date.now();
 const session=await getD1AuthSession(db,token,{...policy,projectId,now});
 if(!session)return {status:'guest' as const};
 if(session.user.mustChangePassword)return {status:'password-change-required' as const,user:session.user};
 if(session.user.adminRole)throw new Error('Admin access projection is not implemented');
 const mirror=await assertD1AuthMirrorReady(db,{projectId,now});
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const tokenHash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 // Session and rights are checked in the SAME read statement. A revocation,
 // changed credential/version/status or stale Auth mirror between the initial
 // session lookup and this query cannot return course rights from that lookup.
 const guard=` AND EXISTS(SELECT 1 FROM d1_auth_sessions s JOIN d1_auth_accounts a ON a.user_id=s.user_id
 WHERE s.token_hash=?5 AND s.project_id=?4 AND s.user_id=u.id AND s.revoked_at IS NULL
 AND s.session_version=a.session_version AND julianday(s.expires_at)>julianday(?3)
 AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?3)
 AND a.deleted_at IS NULL AND a.is_anonymous=0 AND a.must_change_password=0
 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?3)))
 AND ${authMirrorReadySql(4,6,3)} AND (?7='null' OR EXISTS(SELECT 1 FROM json_each(?7) allowed WHERE allowed.value=u.id))`;
 let denied=false;
 try{
  const access=await readD1StudentCourseAccess(async(sql,args)=>{
   const value=await db.first(sql+guard,[...args,tokenHash,mirror.floor,policy.allowedUserIds===undefined?'null':JSON.stringify(policy.allowedUserIds)]);
   if(!value)denied=true;
   return value;
  },session.user,{now});
  return {status:'student' as const,user:session.user,access};
 }catch(error){
  if(denied){await assertD1AuthMirrorReady(db,{projectId,now});return {status:'guest' as const};}
  throw error;
 }
}

import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {assertD1AuthMirrorReady,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';
import {authProofDigest} from '@/lib/cloudflare/auth-proof-domain';
const projectId='vsxxgdzwtscuxcmjfckt';
// Native QA ledger only, backend cohort required. No Source writes or external
// delivery. The INSERT rechecks session/account/cohort after the earlier lookup.
export async function logD1StudentDashboardVisit(db:AuthDatabase,token:string,ownedSlugs:readonly string[],policy:{sessionTtlMs:number;allowedUserIds:readonly string[];now?:number}){
 if(!policy.allowedUserIds.length||ownedSlugs.length>1000||ownedSlugs.some(s=>typeof s!=='string'||!s||s.length>200))throw Error('Invalid native dashboard activity');
 const now=policy.now??Date.now(),options={...policy,projectId,now};
 const session=await getD1AuthSession(db,token,options);
 if(!session||session.user.mustChangePassword||session.user.adminRole)throw Error('Verified student session required');
 const window=await assertD1AuthMirrorReady(db,options),hash=await authProofDigest(token,options),id=crypto.randomUUID();
 const result=await db.batch([{sql:`INSERT INTO d1_student_activity_events
  (id,source_project_id,user_id,student_email,event_type,event_title,event_description,status,actor_type,actor_id,actor_email,metadata,created_at)
  SELECT ?1,?2,u.id,u.normalized_email,'student_login_success','Học viên vào dashboard',
   'Session hợp lệ và dashboard học viên đã render thành công.','success','student',u.id,u.normalized_email,?7,?3
  FROM d1_auth_sessions s JOIN d1_auth_accounts a ON a.user_id=s.user_id JOIN d1_access_users u ON u.id=a.user_id
  WHERE s.token_hash=?4 AND s.project_id=?2 AND s.user_id=?8 AND s.revoked_at IS NULL
   AND s.session_version=a.session_version AND julianday(s.expires_at)>julianday(?3)
   AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?3)
   AND a.deleted_at IS NULL AND a.is_anonymous=0 AND a.must_change_password=0
   AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?3))
   AND coalesce(u.admin_role,'') NOT IN ('owner','editor')
   AND ${authMirrorReadySql(2,5,3)}
   AND EXISTS(SELECT 1 FROM json_each(?6) allowed WHERE allowed.value=u.id)
   AND NOT EXISTS(SELECT 1 FROM d1_student_activity_events old WHERE old.source_project_id=?2 AND old.user_id=u.id
    AND old.event_type='student_login_success' AND julianday(old.created_at)>=julianday(?3)-15.0/1440)
   RETURNING id`,params:[id,projectId,window.stamp,hash,window.floor,JSON.stringify(policy.allowedUserIds),JSON.stringify({route:'/dashboard',ownedSlugs}),session.user.id]}]);
 if(result.length!==1)throw Error('Native dashboard activity unavailable');
 return {recorded:result[0]?.results?.length===1};
}

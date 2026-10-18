import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {assertD1AuthMirrorReady,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';
import {authProofDigest,type AuthAuthorityPolicy} from '@/lib/cloudflare/auth-proof-domain';
type Policy=AuthAuthorityPolicy&{sessionTtlMs:number;allowedUserIds:readonly string[];now?:number};
export function normalizeNativeAccountProfile(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='fullName,phone')throw new RangeError('Invalid account profile');
 const v=value as Record<string,unknown>;
 if(typeof v.fullName!=='string'||typeof v.phone!=='string'||v.fullName.length>1024||v.phone.length>256||/[\u0000-\u001f\u007f]|\p{Surrogate}/u.test(v.fullName))throw new RangeError('Invalid account profile');
 const fullName=v.fullName.trim().slice(0,120),phone=v.phone.replace(/[^0-9+() .-]/g,'').trim().slice(0,24);
 if(!fullName||/\p{Surrogate}/u.test(fullName)||phone.length<8)throw new RangeError('Invalid account profile');
 return {fullName,phone};
}
// QA D1 only. No email/role/credential update, no Source write or delivery.
// Retain all unrelated metadata. Same-row CAS plus final guarded receipt makes
// concurrent revocation/authority loss roll the entire batch back.
export async function updateD1AccountProfile(db:AuthDatabase,token:string,input:unknown,policy:Policy){
 const profile=normalizeNativeAccountProfile(input);
 if(policy.projectId!=='vsxxgdzwtscuxcmjfckt'||!Array.isArray(policy.allowedUserIds)||!policy.allowedUserIds.length||policy.allowedUserIds.length>100)throw Error('Account profile unavailable');
 const session=await getD1AuthSession(db,token,policy);if(!session||session.user.mustChangePassword||session.user.adminRole)return null;
 const before=await db.first('SELECT user_metadata,updated_at FROM d1_auth_accounts WHERE user_id=?1',[session.user.id]);
 if(!before||typeof before.user_metadata!=='string'||typeof before.updated_at!=='string')throw Error('Account profile unavailable');
 const mirror=await assertD1AuthMirrorReady(db,policy),hash=await authProofDigest(token,policy);
 const params=[hash,policy.projectId,mirror.stamp,mirror.floor,JSON.stringify(policy.allowedUserIds),session.user.id,before.user_metadata,before.updated_at,profile.fullName,profile.phone];
 const guard=`EXISTS(SELECT 1 FROM d1_auth_sessions s JOIN d1_auth_accounts a ON a.user_id=s.user_id
 JOIN d1_access_users u ON u.id=a.user_id WHERE s.token_hash=?1 AND s.project_id=?2 AND s.user_id=?6
 AND s.revoked_at IS NULL AND s.session_version=a.session_version AND julianday(s.expires_at)>julianday(?3)
 AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?3)
 AND a.deleted_at IS NULL AND a.is_anonymous=0 AND a.must_change_password=0
 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?3))
 AND coalesce(u.admin_role,'') NOT IN ('owner','editor')
 AND ${authMirrorReadySql(2,4,3,policy.nativeAuthority)}
 AND EXISTS(SELECT 1 FROM json_each(?5) allowed WHERE allowed.value=a.user_id))`;
 const metadata="json_set(?7,'$.full_name',?9,'$.phone',?10)";
 const results=await db.batch([
  {sql:`UPDATE d1_auth_accounts SET user_metadata=${metadata},updated_at=?3
   WHERE user_id=?6 AND user_metadata IS ?7 AND updated_at IS ?8 AND ${guard}`,params},
  {sql:`SELECT CASE WHEN ${guard} AND EXISTS(SELECT 1 FROM d1_auth_accounts
   WHERE user_id=?6 AND user_metadata IS ${metadata} AND updated_at IS ?3)
   THEN 1 ELSE abs(-9223372036854775808) END AS updated`,params},
 ]);
 if(results.length!==2||results[1]?.results?.[0]?.updated!==1)throw Error('Account profile unavailable');
 return profile;
}

import {base64url} from 'jose';
import {authProofDigest,authAuthorityContext} from '@/lib/cloudflare/auth-proof-domain';
import type {AuthorityHandoff} from '@/lib/cloudflare/d1-data-authority';
import {lookupD1VerifiedGoogleSubject,type VerifiedGoogleSubject} from '@/lib/cloudflare/google-id-token';
import {requireClaimedGoogleTransaction,type ClaimedGoogleTransaction} from '@/lib/cloudflare/d1-google-transaction';
import {assertD1AuthMirrorReady,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';
import {getD1AuthSession,revokeD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
// No provider token exchange or HTTP transport here. Both arguments carry
// internal backend proofs; raw JSON/client subject/email cannot issue a session.
export async function finishD1GoogleSession(db:AuthDatabase,transaction:ClaimedGoogleTransaction,subject:VerifiedGoogleSubject,policy:{sessionTtlMs:number;now?:number;nativeAuthority?:AuthorityHandoff;allowedUserIds?:readonly string[]}){
 const tx=requireClaimedGoogleTransaction(transaction),sessionPolicy={...policy,projectId:transaction.projectId};
 if(tx.authorityContext!==authAuthorityContext(sessionPolicy))throw new Error('Google transaction authority mismatch');
 const ids=policy.allowedUserIds;if(ids!==undefined&&(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))||new Set(ids).size!==ids.length))throw new Error('Invalid Google session cohort');
 if(subject.projectId!==tx.projectId||subject.clientId!==tx.clientId||subject.nonce!==tx.nonce)throw new Error('Google transaction/token binding mismatch');
 const now=policy.now??Date.now();if(!Number.isInteger(policy.sessionTtlMs)||policy.sessionTtlMs<1000||policy.sessionTtlMs>30*86400000||!Number.isFinite(now))throw new Error('Invalid Google session policy');
 const user=await lookupD1VerifiedGoogleSubject(db,subject,now,policy.nativeAuthority);if(!user||ids!==undefined&&!ids.includes(user.id))return null;
 const mirror=await assertD1AuthMirrorReady(db,{...sessionPolicy,now});
 const token=base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
 const hash=await authProofDigest(token,sessionPolicy);
 const expiry=new Date(now+policy.sessionTtlMs).toISOString();
 const params=[tx.stateHash,mirror.stamp,tx.projectId,hash,crypto.randomUUID(),expiry,user.id,user.identityId,subject.subject,user.sessionVersion,mirror.floor,tx.browserHash,ids===undefined?'null':JSON.stringify(ids)];
 const eligible=`SELECT a.user_id,a.session_version FROM d1_oauth_transactions t JOIN d1_auth_provider_identities i ON i.source_project_id=t.source_project_id
 JOIN d1_auth_accounts a ON a.user_id=i.user_id JOIN d1_access_users u ON u.id=a.user_id
 WHERE t.state_hash=?1 AND t.source_project_id=?3 AND t.browser_hash=?12 AND t.provider='google' AND t.status='claimed'
 AND julianday(t.expires_at)>julianday(?2) AND i.provider='google' AND i.provider_id=?9 AND i.id=?8 AND a.user_id=?7 AND a.session_version=?10
 AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?2) AND a.deleted_at IS NULL AND a.is_anonymous=0
 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?2)) AND ${authMirrorReadySql(3,11,2,policy.nativeAuthority)} AND (?13='null' OR EXISTS(SELECT 1 FROM json_each(?13) allowed WHERE allowed.value=a.user_id))`;
 const cleanupPolicy={...sessionPolicy,now,allowedUserIds:undefined};
 let result;
 try{result=await db.batch([
  {sql:`INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at)
   SELECT ?4,e.user_id,?3,?5,e.session_version,?2,?6 FROM (${eligible}) e RETURNING user_id`,params},
  {sql:`UPDATE d1_oauth_transactions SET status='done',completed_at=?2 WHERE state_hash=?1 AND source_project_id=?3 AND status='claimed'
   AND EXISTS(SELECT 1 FROM d1_auth_sessions s WHERE s.token_hash=?4 AND s.user_id=?5) RETURNING state_hash`,params:[tx.stateHash,mirror.stamp,tx.projectId,hash,user.id]},
  {sql:`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE token_hash=?4)
   OR (EXISTS(SELECT 1 FROM d1_oauth_transactions WHERE state_hash=?1 AND source_project_id=?3 AND browser_hash=?12 AND status='done' AND completed_at=?2) AND ${authMirrorReadySql(3,11,2,policy.nativeAuthority)}) THEN 1 ELSE abs(-9223372036854775808) END AS valid`,params:params.slice(0,12)},
 ]);}catch{await revokeD1AuthSession(db,token,cleanupPolicy);throw new Error('Google session transaction unavailable');}
 if(!result[0]?.results?.length){await assertD1AuthMirrorReady(db,{...sessionPolicy,now});return null;}
 if(result[1]?.results?.length!==1){await revokeD1AuthSession(db,token,cleanupPolicy);throw new Error('Google transaction completion unavailable');}
 try{
  const current=await getD1AuthSession(db,token,{...sessionPolicy,now});
  if(!current){await revokeD1AuthSession(db,token,cleanupPolicy);return null;}
  return {token,expiresAt:expiry,user:current.user,returnTo:tx.returnTo,rememberLogin:tx.rememberLogin};
 }catch{await revokeD1AuthSession(db,token,cleanupPolicy);throw new Error('Google session authority unavailable');}
}
